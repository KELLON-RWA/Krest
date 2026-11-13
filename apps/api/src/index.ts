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

await app.register(cors, {
  origin: (origin, cb) => {
    // Allow requests without Origin (server-to-server API telemetry, curl)
    if (!origin) {
      cb(null, true);
      return;
    }
    const allowedDashboards = config.CORS_ORIGIN.split(",").map((s) => s.trim());
    if (allowedDashboards.includes(origin)) {
      cb(null, true);
      return;
    }
    // Public ingestion & SDK script routes enforce project-level allowedOrigins in route handlers
    cb(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-krest-key"],
});

await app.register(rateLimit, {
  max: 300,
  timeWindow: "1 minute",
});

app.get("/", async (_request, reply) => {
  return reply.send({
    service: "krest-api",
    status: "ok",
    health: "/health",
    sdk: "/krest.js",
  });
});

app.get("/health", async (_request, reply) => {
  try {
    await db.execute(sql`SELECT 1`);
    return reply.send({ status: "ok", db: "connected" });
  } catch {
    return reply.code(503).send({ status: "error", db: "disconnected" });
  }
});

let cachedSdk = loadSdkBundle();
app.get("/krest.js", async (_request, reply) => {
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

await app.register(authRoutes);
await app.register(projectRoutes);
await app.register(ingestRoutes);
await app.register(analyticsRoutes);
await app.register(ecosystemRoutes);

const shutdown = async () => {
  app.log.info("Shutting down Krest API...");
  await app.close();
  await pool.end();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({ port: config.PORT, host: config.HOST });
