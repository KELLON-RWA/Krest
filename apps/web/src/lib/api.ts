export function getApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_API_URL environment variable is not configured");
  }
  return url.replace(/\/+$/, "");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getApiUrl();
  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data as T;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  allowedOrigins: string[];
  publicKey: string;
  secretKeyPrefix: string;
  shareWithEcosystem: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectAnalytics {
  range: string;
  web: {
    summary: {
      uniqueVisitors: number;
      totalPageviews: number;
      totalSessions: number;
      walletConnects: number;
      txInitiated: number;
      txConfirmed: number;
      txFailed: number;
    };
    series: Array<{ bucket: string; visitors: number; pageviews: number }>;
    topPages: Array<{ path: string; views: number; visitors: number }>;
    topReferrers: Array<{ referrer: string; visits: number }>;
    countries: Array<{ country: string; visitors: number }>;
    devices: Array<{ device: string; visitors: number }>;
    browsers: Array<{ browser: string; visitors: number }>;
    stellar: {
      wallets: Array<{ wallet: string; connections: number }>;
      networks: Array<{ network: string; events: number }>;
      contracts: Array<{ contractId: string; calls: number }>;
    };
  };
  api: {
    summary: {
      totalRequests: number;
      errorCount: number;
      errorRate: number;
      uniqueConsumers: number;
      avgLatencyMs: number;
      p50LatencyMs: number;
      p95LatencyMs: number;
      p99LatencyMs: number;
    };
    series: Array<{
      bucket: string;
      requests: number;
      errors: number;
      avg_latency_ms: number;
    }>;
    topRoutes: Array<{
      method: string;
      route: string;
      requests: number;
      errors: number;
      avg_latency_ms: number;
      p95_latency_ms: number;
    }>;
    rpcMethods: Array<{ rpcMethod: string; calls: number }>;
  };
}

export interface EcosystemStats {
  range: string;
  summary: {
    participatingProjects: number;
    totalVisitors: number;
    totalPageviews: number;
    totalWalletConnects: number;
    totalTxConfirmed: number;
    totalApiRequests: number;
    avgApiLatencyMs: number;
  };
  walletShare: Array<{ wallet: string; connections: number }>;
  networkShare: Array<{ network: string; events: number }>;
  dailyActivity: Array<{ bucket: string; visitors: number; pageviews: number }>;
}
