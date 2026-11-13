import type { FastifyInstance } from "fastify";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { apiEvents, projects, webEvents } from "../db/schema.js";
import {
  computeSessionHash,
  computeVisitorHash,
  getDailySalt,
  sha256Hex,
} from "../lib/crypto.js";
import { parseUserAgent } from "../lib/ua.js";

const webEventSchema = z.object({
  eventType: z.enum(["pageview", "custom", "wallet_connect", "tx_funnel"]),
  eventName: z.string().max(120).optional(),
  path: z.string().min(1).max(512),
  referrerDomain: z.string().max(255).optional(),
  utmSource: z.string().max(120).optional(),
  utmMedium: z.string().max(120).optional(),
  utmCampaign: z.string().max(120).optional(),
  walletName: z.string().max(64).optional(),
  network: z.enum(["mainnet", "testnet", "futurenet", "standalone"]).optional(),
  txStage: z.enum(["initiated", "signed", "submitted", "confirmed", "failed"]).optional(),
  contractId: z.string().max(128).optional(),
  properties: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

const webIngestSchema = z.object({
  publicKey: z.string().max(64).optional(),
  events: z.array(webEventSchema).min(1).max(50),
});

const apiEventSchema = z.object({
  method: z.string().min(1).max(16).toUpperCase(),
  route: z.string().min(1).max(512),
  statusCode: z.number().int().min(100).max(599),
  latencyMs: z.number().int().min(0).max(600_000),
  consumerHash: z.string().length(64).optional(),
  sdkName: z.string().max(64).optional(),
  network: z.enum(["mainnet", "testnet", "futurenet", "standalone"]).optional(),
  contractId: z.string().max(128).optional(),
  rpcMethod: z.string().max(64).optional(),
  errorType: z.string().max(64).optional(),
});

const apiIngestSchema = z.object({
  events: z.array(apiEventSchema).min(1).max(100),
});

function extractCountry(headers: Record<string, string | string[] | undefined>): string | null {
  const raw = headers["cf-ipcountry"] || headers["x-vercel-ip-country"] || headers["x-country"];
  const val = Array.isArray(raw) ? raw[0] : raw;
  if (!val || val.length !== 2 || val === "XX" || val === "T1") return null;
  return val.toUpperCase();
}

export async function ingestRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/ingest/web", async (request, reply) => {
    const parsed = webIngestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid web event batch" });
    }

    const headerKey = request.headers["x-krest-key"];
    const publicKey =
      (Array.isArray(headerKey) ? headerKey[0] : headerKey) || parsed.data.publicKey;

    if (!publicKey || !publicKey.startsWith("pk_live_")) {
      return reply.code(401).send({ error: "Missing or invalid public key" });
    }

    const [project] = await db
      .select({
        id: projects.id,
        allowedOrigins: projects.allowedOrigins,
      })
      .from(projects)
      .where(eq(projects.publicKey, publicKey))
      .limit(1);

    if (!project) {
      return reply.code(401).send({ error: "Unknown project public key" });
    }

    const origin = request.headers.origin;
    if (project.allowedOrigins.length > 0 && origin && !project.allowedOrigins.includes(origin)) {
      return reply.code(403).send({ error: "Origin not allowed for this project" });
    }

    const uaString =
      typeof request.headers["user-agent"] === "string" ? request.headers["user-agent"] : "";
    const parsedUa = parseUserAgent(uaString);
    if (parsedUa.isBot) {
      return reply.code(202).send({ accepted: 0, filtered: "bot" });
    }

    const dailySalt = await getDailySalt();
    const visitorHash = computeVisitorHash(dailySalt, project.id, request.ip, uaString);
    const sessionHash = computeSessionHash(dailySalt, visitorHash);
    const country = extractCountry(request.headers);

    const rows = parsed.data.events.map((ev) => ({
      projectId: project.id,
      visitorHash,
      sessionHash,
      eventType: ev.eventType,
      eventName: ev.eventName ?? null,
      path: ev.path,
      referrerDomain: ev.referrerDomain ?? null,
      utmSource: ev.utmSource ?? null,
      utmMedium: ev.utmMedium ?? null,
      utmCampaign: ev.utmCampaign ?? null,
      country,
      deviceType: parsedUa.deviceType,
      browser: parsedUa.browser,
      os: parsedUa.os,
      walletName: ev.walletName ?? null,
      network: ev.network ?? null,
      txStage: ev.txStage ?? null,
      contractId: ev.contractId ?? null,
      properties: ev.properties ?? null,
    }));

    await db.insert(webEvents).values(rows);
    return reply.code(202).send({ accepted: rows.length });
  });

  app.post("/v1/ingest/api", async (request, reply) => {
    const headerKey = request.headers["x-krest-key"];
    const secretKey = Array.isArray(headerKey) ? headerKey[0] : headerKey;

    if (!secretKey || !secretKey.startsWith("sk_live_")) {
      return reply.code(401).send({ error: "Missing or invalid secret key" });
    }

    const [project] = await db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.secretKeyHash, sha256Hex(secretKey)))
      .limit(1);

    if (!project) {
      return reply.code(401).send({ error: "Unknown project secret key" });
    }

    const parsed = apiIngestSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid API event batch" });
    }

    const rows = parsed.data.events.map((ev) => ({
      projectId: project.id,
      method: ev.method,
      route: ev.route,
      statusCode: ev.statusCode,
      latencyMs: ev.latencyMs,
      consumerHash: ev.consumerHash ?? null,
      sdkName: ev.sdkName ?? null,
      network: ev.network ?? null,
      contractId: ev.contractId ?? null,
      rpcMethod: ev.rpcMethod ?? null,
      errorType: ev.errorType ?? null,
    }));

    await db.insert(apiEvents).values(rows);
    return reply.code(202).send({ accepted: rows.length });
  });
}
