import { createHash } from "node:crypto";

export interface KrestApiConfig {
  secretKey: string;
  endpoint: string;
  flushIntervalMs?: number;
  maxBatchSize?: number;
  ignorePaths?: string[];
}

export interface ApiEventInput {
  method: string;
  route: string;
  statusCode: number;
  latencyMs: number;
  consumerId?: string;
  sdkName?: string;
  network?: "mainnet" | "testnet" | "futurenet" | "standalone";
  contractId?: string;
  rpcMethod?: string;
  errorType?: string;
}

export interface KrestApiClient {
  record(event: ApiEventInput): void;
  flush(): Promise<void>;
  shutdown(): Promise<void>;
}

function hashConsumer(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

export function createKrestApiClient(config: KrestApiConfig): KrestApiClient {
  if (!config.secretKey || !config.endpoint) {
    throw new Error("@krest/middleware-node: secretKey and endpoint are required");
  }

  const endpoint = config.endpoint.replace(/\/+$/, "");
  const maxBatchSize = config.maxBatchSize ?? 50;
  const flushIntervalMs = config.flushIntervalMs ?? 2000;
  let queue: Array<Omit<ApiEventInput, "consumerId"> & { consumerHash?: string }> = [];
  let timer: ReturnType<typeof setTimeout> | null = null;

  async function flush(): Promise<void> {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (queue.length === 0) return;

    const batch = queue.splice(0, maxBatchSize);
    try {
      await fetch(`${endpoint}/v1/ingest/api`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-krest-key": config.secretKey,
        },
        body: JSON.stringify({ events: batch }),
      });
    } catch {
      // Telemetry failures must never impact host API availability
    }
  }

  function record(event: ApiEventInput): void {
    const { consumerId, ...rest } = event;
    queue.push({
      ...rest,
      latencyMs: Math.max(0, Math.round(rest.latencyMs)),
      consumerHash: consumerId ? hashConsumer(consumerId) : undefined,
    });

    if (queue.length >= maxBatchSize) {
      void flush();
      return;
    }
    if (!timer) {
      timer = setTimeout(() => {
        void flush();
      }, flushIntervalMs);
      if (typeof timer.unref === "function") {
        timer.unref();
      }
    }
  }

  async function shutdown(): Promise<void> {
    while (queue.length > 0) {
      await flush();
    }
  }

  return { record, flush, shutdown };
}

interface ExpressLikeReq {
  method: string;
  path?: string;
  originalUrl?: string;
  url?: string;
  route?: { path?: string };
  headers: Record<string, string | string[] | undefined>;
}

interface ExpressLikeRes {
  statusCode: number;
  on(event: "finish", listener: () => void): void;
}

export function krestExpressMiddleware(config: KrestApiConfig) {
  const client = createKrestApiClient(config);
  const ignored = new Set(config.ignorePaths ?? ["/health", "/favicon.ico"]);

  return function krestMiddleware(
    req: ExpressLikeReq,
    res: ExpressLikeRes,
    next: () => void
  ): void {
    const rawPath = req.route?.path || req.path || (req.originalUrl || req.url || "/").split("?")[0];
    if (ignored.has(rawPath)) {
      next();
      return;
    }

    const start = performance.now();
    res.on("finish", () => {
      const latencyMs = performance.now() - start;
      const consumerHeader = req.headers["x-api-key"] || req.headers["x-consumer-id"];
      const consumerId = Array.isArray(consumerHeader) ? consumerHeader[0] : consumerHeader;
      const sdkHeader = req.headers["x-stellar-sdk"] || req.headers["user-agent"];
      const sdkName = Array.isArray(sdkHeader) ? sdkHeader[0]?.slice(0, 64) : sdkHeader?.slice(0, 64);

      client.record({
        method: req.method,
        route: rawPath,
        statusCode: res.statusCode,
        latencyMs,
        consumerId,
        sdkName,
        errorType: res.statusCode >= 500 ? "server_error" : res.statusCode >= 400 ? "client_error" : undefined,
      });
    });

    next();
  };
}

export function withKrestApi<T extends Request>(
  handler: (req: T) => Promise<Response> | Response,
  config: KrestApiConfig & { route?: string }
): (req: T) => Promise<Response> {
  const client = createKrestApiClient(config);

  return async (req: T): Promise<Response> => {
    const start = performance.now();
    const url = new URL(req.url);
    const route = config.route || url.pathname;

    try {
      const res = await handler(req);
      const latencyMs = performance.now() - start;
      client.record({
        method: req.method,
        route,
        statusCode: res.status,
        latencyMs,
        consumerId: req.headers.get("x-api-key") || undefined,
        errorType: res.status >= 500 ? "server_error" : res.status >= 400 ? "client_error" : undefined,
      });
      return res;
    } catch (err) {
      const latencyMs = performance.now() - start;
      client.record({
        method: req.method,
        route,
        statusCode: 500,
        latencyMs,
        consumerId: req.headers.get("x-api-key") || undefined,
        errorType: err instanceof Error ? err.name : "unhandled_error",
      });
      throw err;
    }
  };
}
