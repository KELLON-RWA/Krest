import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";

const querySchema = z.object({
  range: z.enum(["7d", "30d", "90d"]).default("30d"),
});

export async function ecosystemRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/ecosystem", async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Invalid range parameter" });
    }

    const days = parsed.data.range === "7d" ? 7 : parsed.data.range === "30d" ? 30 : 90;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [projectsRes, webRes, apiRes, walletsRes, networksRes, dailyRes] = await Promise.all([
      db.execute(sql`
        SELECT COUNT(*)::int AS participating_projects
        FROM projects
        WHERE share_with_ecosystem = true
      `),
      db.execute(sql`
        SELECT
          COUNT(DISTINCT w.visitor_hash)::int AS total_visitors,
          COUNT(*) FILTER (WHERE w.event_type = 'pageview')::int AS total_pageviews,
          COUNT(*) FILTER (WHERE w.event_type = 'wallet_connect')::int AS total_wallet_connects,
          COUNT(*) FILTER (WHERE w.event_type = 'tx_funnel' AND w.tx_stage = 'confirmed')::int AS total_tx_confirmed
        FROM web_events w
        INNER JOIN projects p ON p.id = w.project_id
        WHERE p.share_with_ecosystem = true AND w.created_at >= ${since}
      `),
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total_api_requests,
          COALESCE(ROUND(AVG(a.latency_ms))::int, 0) AS avg_latency_ms
        FROM api_events a
        INNER JOIN projects p ON p.id = a.project_id
        WHERE p.share_with_ecosystem = true AND a.created_at >= ${since}
      `),
      db.execute(sql`
        SELECT w.wallet_name AS wallet, COUNT(*)::int AS connections
        FROM web_events w
        INNER JOIN projects p ON p.id = w.project_id
        WHERE p.share_with_ecosystem = true
          AND w.created_at >= ${since}
          AND w.wallet_name IS NOT NULL
        GROUP BY w.wallet_name
        ORDER BY connections DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT w.network, COUNT(*)::int AS events
        FROM web_events w
        INNER JOIN projects p ON p.id = w.project_id
        WHERE p.share_with_ecosystem = true
          AND w.created_at >= ${since}
          AND w.network IS NOT NULL
        GROUP BY w.network
        ORDER BY events DESC
      `),
      db.execute(sql`
        SELECT
          date_trunc('day', w.created_at) AS bucket,
          COUNT(DISTINCT w.visitor_hash)::int AS visitors,
          COUNT(*) FILTER (WHERE w.event_type = 'pageview')::int AS pageviews
        FROM web_events w
        INNER JOIN projects p ON p.id = w.project_id
        WHERE p.share_with_ecosystem = true AND w.created_at >= ${since}
        GROUP BY bucket
        ORDER BY bucket ASC
      `),
    ]);

    const pRow = projectsRes.rows[0] as Record<string, number>;
    const wRow = webRes.rows[0] as Record<string, number>;
    const aRow = apiRes.rows[0] as Record<string, number>;

    return reply.send({
      range: parsed.data.range,
      summary: {
        participatingProjects: pRow.participating_projects ?? 0,
        totalVisitors: wRow.total_visitors ?? 0,
        totalPageviews: wRow.total_pageviews ?? 0,
        totalWalletConnects: wRow.total_wallet_connects ?? 0,
        totalTxConfirmed: wRow.total_tx_confirmed ?? 0,
        totalApiRequests: aRow.total_api_requests ?? 0,
        avgApiLatencyMs: aRow.avg_latency_ms ?? 0,
      },
      walletShare: walletsRes.rows,
      networkShare: networksRes.rows,
      dailyActivity: dailyRes.rows,
    });
  });
}
