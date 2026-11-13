import { sql } from "drizzle-orm";
import { db } from "../db/index.js";

const DAY_MS = 24 * 60 * 60 * 1000;

interface Logger {
  info: (obj: unknown, msg: string) => void;
  error: (obj: unknown, msg: string) => void;
}

function rowCount(result: unknown): number {
  return Number((result as { rowCount?: number }).rowCount ?? 0);
}

/**
 * Deletes expired sessions and (optionally) raw events older than the retention
 * window. Krest keeps no IPs or User-Agents, but event rows still accumulate and
 * should not live forever. A retention value of 0 disables event purge.
 */
export async function purgeExpiredData(retentionDays: number): Promise<{
  deletedSessions: number;
  deletedWebEvents: number;
  deletedApiEvents: number;
}> {
  const sessionsRes = await db.execute(sql`DELETE FROM sessions WHERE expires_at < NOW()`);

  let deletedWebEvents = 0;
  let deletedApiEvents = 0;

  if (retentionDays > 0) {
    const cutoff = new Date(Date.now() - retentionDays * DAY_MS);
    const webRes = await db.execute(
      sql`DELETE FROM web_events WHERE created_at < ${cutoff}`
    );
    const apiRes = await db.execute(
      sql`DELETE FROM api_events WHERE created_at < ${cutoff}`
    );
    deletedWebEvents = rowCount(webRes);
    deletedApiEvents = rowCount(apiRes);
  }

  return {
    deletedSessions: rowCount(sessionsRes),
    deletedWebEvents,
    deletedApiEvents,
  };
}

export function startRetentionJob(retentionDays: number, logger?: Logger): NodeJS.Timeout {
  const run = async (): Promise<void> => {
    try {
      const result = await purgeExpiredData(retentionDays);
      logger?.info(result, "retention purge complete");
    } catch (err) {
      logger?.error({ err }, "retention purge failed");
    }
  };

  void run();
  const timer = setInterval(() => void run(), DAY_MS);
  timer.unref();
  return timer;
}
