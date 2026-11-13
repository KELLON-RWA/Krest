import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

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
  // 30-minute fixed window for privacy-first session estimation without cookies.
  // A window is intentionally not "rolling": sessions crossing a boundary are
  // counted as two. This keeps the calculation stateless and cookie-free.
  const bucket = Math.floor(nowMs / (30 * 60 * 1000));
  return createHmac("sha256", dailySalt)
    .update(`session:${visitorHash}:${bucket}`)
    .digest("hex");
}
