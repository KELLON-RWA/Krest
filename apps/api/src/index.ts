import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import { sql } from "drizzle-orm";
import { config } from "./config.js";
import { db, pool } from "./db/index.js";
import { startRetentionJob } from "./lib/retention.js";
import { authRoutes } from "./routes/auth.js";
import { projectRoutes } from "./routes/projects.js";
import { ingestRoutes } from "./routes/ingest.js";
import { analyticsRoutes } from "./routes/analytics.js";
import { ecosystemRoutes } from "./routes/ecosystem.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSdkBundle(): string | null {
  const candidates = [
    resolve(__dirname, "../../../packages/sdk-web/dist/krest.global.js"),
    resolve(__dirname, "../../packages/sdk-web/dist/krest.global.js"),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return readFileSync(p, "utf-8");
    }
  }
  return null;
}

const app = Fastify({
  logger: {
    level: config.NODE_ENV === "production" ? "info" : "debug",
  },
  trustProxy: config.TRUST_PROXY,
});

await app.register(cookie);

await app.register(rateLimit, {
  max: 300,
  timeWindow: "1 minute",
});

const corsMethods = ["GET", "POST", "PATCH", "DELETE", "OPTIONS"];
const corsAllowedHeaders = ["Content-Type", "Authorization", "x-krest-key"];
const allowedDashboardOrigins = config.CORS_ORIGIN.split(",")
  .map((s) => s.trim())
  .filter(Boolean);

let cachedSdk = loadSdkBundle();

// Public surface. Cross-origin access is intentionally open here because the
// public write key and per-project allowedOrigins govern ingestion. Authentication
// cookies are never sent to these routes.
await app.register(async (publicScope) => {
  await publicScope.register(cors, {
    origin: true,
    credentials: false,
    methods: corsMethods,
    allowedHeaders: corsAllowedHeaders,
  });

  publicScope.get("/", async (_request, reply) => {
    return reply.send({
      service: "krest-api",
      status: "ok",
      health: "/health",
      sdk: "/krest.js",
    });
  });

  publicScope.get("/health", async (_request, reply) => {
    try {
      await db.execute(sql`SELECT 1`);
      return reply.send({ status: "ok", db: "connected" });
    } catch {
      return reply.code(503).send({ status: "error", db: "disconnected" });
    }
  });

  publicScope.get("/krest.js", async (_request, reply) => {
    if (!cachedSdk) {
      cachedSdk = loadSdkBundle();
    }
    if (!cachedSdk) {
      return reply.code(404).send("// Krest SDK bundle not built yet");
    }
    return reply
      .header("Content-Type", "application/javascript; charset=utf-8")
      .header("Access-Control-Allow-Origin", "*")
      .header("Cache-Control", "public, max-age=3600")
      .send(cachedSdk);
  });

  await publicScope.register(ingestRoutes);
  await publicScope.register(ecosystemRoutes);
});

// Authenticated dashboard surface. Only origins explicitly listed in
// CORS_ORIGIN may make credentialed cross-origin requests.
await app.register(async (privateScope) => {
  await privateScope.register(cors, {
    origin: allowedDashboardOrigins,
    credentials: true,
    methods: corsMethods,
    allowedHeaders: corsAllowedHeaders,
  });

  await privateScope.register(authRoutes);
  await privateScope.register(projectRoutes);
  await privateScope.register(analyticsRoutes);
});

const retentionTimer = startRetentionJob(config.EVENT_RETENTION_DAYS, app.log);

const shutdown = async () => {
  app.log.info("Shutting down Krest API...");
  clearInterval(retentionTimer);
  await app.close();
  await pool.end();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: config.PORT, host: config.HOST });
