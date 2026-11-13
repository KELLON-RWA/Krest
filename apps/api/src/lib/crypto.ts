import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { eq, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { dailySalts } from "../db/schema.js";

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [salt, keyHex] = stored.split(":");
  if (!salt || !keyHex) return false;
  const keyBuf = Buffer.from(keyHex, "hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  if (keyBuf.length !== derived.length) return false;
  return timingSafeEqual(keyBuf, derived);
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}

export function generateProjectKeys(): {
  publicKey: string;
  secretKey: string;
  secretKeyHash: string;
  secretKeyPrefix: string;
} {
  const publicKey = `pk_live_${randomBytes(16).toString("hex")}`;
  const secretKey = `sk_live_${randomBytes(24).toString("hex")}`;
  return {
    publicKey,
    secretKey,
    secretKeyHash: sha256Hex(secretKey),
    secretKeyPrefix: secretKey.slice(0, 14),
  };
}

let cachedDate = "";
let cachedSalt = "";

/**
 * Returns today's UTC rotating salt. Old salts (> 2 days) are purged so
 * daily visitor hashes cannot be linked across days.
 */
export async function getDailySalt(): Promise<string> {
  const today = new Date().toISOString().slice(0, 10);
  if (cachedDate === today && cachedSalt) {
    return cachedSalt;
  }

  const existing = await db
    .select()
    .from(dailySalts)
    .where(eq(dailySalts.utcDate, today))
    .limit(1);

  if (existing.length > 0) {
    cachedDate = today;
    cachedSalt = existing[0].salt;
    return cachedSalt;
  }

  const newSalt = randomBytes(32).toString("hex");
  await db
    .insert(dailySalts)
    .values({ utcDate: today, salt: newSalt })
    .onConflictDoNothing();

  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  await db.delete(dailySalts).where(lt(dailySalts.utcDate, cutoff));

  const row = await db
    .select()
    .from(dailySalts)
    .where(eq(dailySalts.utcDate, today))
    .limit(1);

  cachedDate = today;
  cachedSalt = row[0]?.salt ?? newSalt;
  return cachedSalt;
}

export function computeVisitorHash(
  dailySalt: string,
  projectId: string,
  ip: string,
  userAgent: string
): string {
  return createHmac("sha256", dailySalt)
    .update(`${projectId}:${ip}:${userAgent}`)
    .digest("hex");
}

export function computeSessionHash(
  dailySalt: string,
  visitorHash: string,
  nowMs = Date.now()
): string {
  // 30-minute rolling bucket for privacy-first session estimation without cookies
  const bucket = Math.floor(nowMs / (30 * 60 * 1000));
  return createHmac("sha256", dailySalt)
    .update(`session:${visitorHash}:${bucket}`)
    .digest("hex");
}
