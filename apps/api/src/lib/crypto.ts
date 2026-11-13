import { randomBytes } from "node:crypto";
import { eq, lt } from "drizzle-orm";
import { db } from "../db/index.js";
import { dailySalts } from "../db/schema.js";

export * from "./hashing.js";

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
