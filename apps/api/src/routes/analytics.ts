import type { FastifyInstance } from "fastify";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { projects } from "../db/schema.js";
import { requireAuth } from "../lib/auth.js";

const querySchema = z.object({
  range: z.enum(["24h", "7d", "30d", "90d"]).default("7d"),
});

function rangeToHours(range: "24h" | "7d" | "30d" | "90d"): number {
  switch (range) {
    case "24h":
      return 24;
    case "7d":
      return 7 * 24;
    case "30d":
      return 30 * 24;
    case "90d":
      return 90 * 24;
  }
}

export async function analyticsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/projects/:id/analytics", async (request, reply) => {
    const user = await requireAuth(request, reply);
    if (!user) return;

    const { id } = request.params as { id: string };
    if (!z.string().uuid().safeParse(id).success) {
      return reply.code(400).send({ error: "Invalid project id" });
    }
    const parsedQuery = querySchema.safeParse(request.query);
    if (!parsedQuery.success) {
      return reply.code(400).send({ error: "Invalid range parameter" });
    }

    const [project] = await db
      .select({ id: projects.id, name: projects.name })
      .from(projects)
      .where(and(eq(projects.id, id), eq(projects.userId, user.id)))
      .limit(1);

    if (!project) {
      return reply.code(404).send({ error: "Project not found" });
    }

    const range = parsedQuery.data.range;
    const since = new Date(Date.now() - rangeToHours(range) * 60 * 60 * 1000);
    const bucketUnit = range === "24h" ? "hour" : "day";

    const [
      webSummaryRes,
      webSeriesRes,
      topPagesRes,
      topReferrersRes,
      countriesRes,
      devicesRes,
      browsersRes,
      walletsRes,
      networksRes,
      contractsRes,
      apiSummaryRes,
      apiSeriesRes,
      topRoutesRes,
      rpcMethodsRes,
    ] = await Promise.all([
      db.execute(sql`
        SELECT
          COUNT(DISTINCT visitor_hash)::int AS unique_visitors,
          COUNT(*) FILTER (WHERE event_type = 'pageview')::int AS total_pageviews,
          COUNT(DISTINCT session_hash)::int AS total_sessions,
          COUNT(*) FILTER (WHERE event_type = 'wallet_connect')::int AS wallet_connects,
          COUNT(*) FILTER (WHERE event_type = 'tx_funnel' AND tx_stage = 'initiated')::int AS tx_initiated,
          COUNT(*) FILTER (WHERE event_type = 'tx_funnel' AND tx_stage = 'confirmed')::int AS tx_confirmed,
          COUNT(*) FILTER (WHERE event_type = 'tx_funnel' AND tx_stage = 'failed')::int AS tx_failed
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since}
      `),
      db.execute(sql`
        SELECT
          date_trunc(${bucketUnit}, created_at) AS bucket,
          COUNT(DISTINCT visitor_hash)::int AS visitors,
          COUNT(*) FILTER (WHERE event_type = 'pageview')::int AS pageviews
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since}
        GROUP BY bucket
        ORDER BY bucket ASC
      `),
      db.execute(sql`
        SELECT path, COUNT(*)::int AS views, COUNT(DISTINCT visitor_hash)::int AS visitors
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since} AND event_type = 'pageview'
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT COALESCE(referrer_domain, 'Direct') AS referrer, COUNT(*)::int AS visits
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since} AND event_type = 'pageview'
        GROUP BY referrer
        ORDER BY visits DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT COALESCE(country, 'Unknown') AS country, COUNT(DISTINCT visitor_hash)::int AS visitors
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since}
        GROUP BY country
        ORDER BY visitors DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT COALESCE(device_type, 'unknown') AS device, COUNT(DISTINCT visitor_hash)::int AS visitors
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since}
        GROUP BY device
        ORDER BY visitors DESC
      `),
      db.execute(sql`
        SELECT COALESCE(browser, 'Unknown') AS browser, COUNT(DISTINCT visitor_hash)::int AS visitors
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since}
        GROUP BY browser
        ORDER BY visitors DESC
        LIMIT 8
      `),
      db.execute(sql`
        SELECT wallet_name AS wallet, COUNT(*)::int AS connections
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since} AND wallet_name IS NOT NULL
        GROUP BY wallet_name
        ORDER BY connections DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT network, COUNT(*)::int AS events
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since} AND network IS NOT NULL
        GROUP BY network
        ORDER BY events DESC
      `),
      db.execute(sql`
        SELECT contract_id AS "contractId", COUNT(*)::int AS calls
        FROM web_events
        WHERE project_id = ${id} AND created_at >= ${since} AND contract_id IS NOT NULL
        GROUP BY contract_id
        ORDER BY calls DESC
        LIMIT 10
      `),
      db.execute(sql`
        SELECT
          COUNT(*)::int AS total_requests,
          COUNT(*) FILTER (WHERE status_code >= 400)::int AS error_count,
          COUNT(DISTINCT consumer_hash) FILTER (WHERE consumer_hash IS NOT NULL)::int AS unique_consumers,
          COALESCE(ROUND(AVG(latency_ms))::int, 0) AS avg_latency_ms,
          COALESCE(ROUND(PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY latency_ms))::int, 0) AS p50_latency_ms,
          COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms))::int, 0) AS p95_latency_ms,
          COALESCE(ROUND(PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY latency_ms))::int, 0) AS p99_latency_ms
        FROM api_events
        WHERE project_id = ${id} AND created_at >= ${since}
      `),
      db.execute(sql`
        SELECT
          date_trunc(${bucketUnit}, created_at) AS bucket,
          COUNT(*)::int AS requests,
          COUNT(*) FILTER (WHERE status_code >= 400)::int AS errors,
          COALESCE(ROUND(AVG(latency_ms))::int, 0) AS avg_latency_ms
        FROM api_events
        WHERE project_id = ${id} AND created_at >= ${since}
        GROUP BY bucket
        ORDER BY bucket ASC
      `),
      db.execute(sql`
        SELECT
          method,
          route,
          COUNT(*)::int AS requests,
          COUNT(*) FILTER (WHERE status_code >= 400)::int AS errors,
          COALESCE(ROUND(AVG(latency_ms))::int, 0) AS avg_latency_ms,
          COALESCE(ROUND(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY latency_ms))::int, 0) AS p95_latency_ms
        FROM api_events
        WHERE project_id = ${id} AND created_at >= ${since}
        GROUP BY method, route
        ORDER BY requests DESC
        LIMIT 15
      `),
      db.execute(sql`
        SELECT rpc_method AS "rpcMethod", COUNT(*)::int AS calls
        FROM api_events
        WHERE project_id = ${id} AND created_at >= ${since} AND rpc_method IS NOT NULL
        GROUP BY rpc_method
        ORDER BY calls DESC
        LIMIT 10
      `),
    ]);

    const webSummary = webSummaryRes.rows[0] as Record<string, number>;
    const apiSummary = apiSummaryRes.rows[0] as Record<string, number>;

    return reply.send({
      range,
      web: {
        summary: {
          uniqueVisitors: webSummary.unique_visitors ?? 0,
          totalPageviews: webSummary.total_pageviews ?? 0,
          totalSessions: webSummary.total_sessions ?? 0,
          walletConnects: webSummary.wallet_connects ?? 0,
          txInitiated: webSummary.tx_initiated ?? 0,
          txConfirmed: webSummary.tx_confirmed ?? 0,
          txFailed: webSummary.tx_failed ?? 0,
        },
        series: webSeriesRes.rows,
        topPages: topPagesRes.rows,
        topReferrers: topReferrersRes.rows,
        countries: countriesRes.rows,
        devices: devicesRes.rows,
        browsers: browsersRes.rows,
        stellar: {
          wallets: walletsRes.rows,
          networks: networksRes.rows,
          contracts: contractsRes.rows,
        },
      },
      api: {
        summary: {
          totalRequests: apiSummary.total_requests ?? 0,
          errorCount: apiSummary.error_count ?? 0,
          errorRate:
            (apiSummary.total_requests ?? 0) > 0
              ? Number((((apiSummary.error_count ?? 0) / apiSummary.total_requests) * 100).toFixed(2))
              : 0,
          uniqueConsumers: apiSummary.unique_consumers ?? 0,
          avgLatencyMs: apiSummary.avg_latency_ms ?? 0,
          p50LatencyMs: apiSummary.p50_latency_ms ?? 0,
          p95LatencyMs: apiSummary.p95_latency_ms ?? 0,
          p99LatencyMs: apiSummary.p99_latency_ms ?? 0,
        },
        series: apiSeriesRes.rows,
        topRoutes: topRoutesRes.rows,
        rpcMethods: rpcMethodsRes.rows,
      },
    });
  });
}
