"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Activity, ShieldCheck } from "lucide-react";
import { apiFetch, type EcosystemStats } from "@/lib/api";

export default function EcosystemPage() {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("30d");
  const [data, setData] = useState<EcosystemStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    apiFetch<EcosystemStats>(`/v1/ecosystem?range=${range}`)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : "Failed to load ecosystem data");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [range]);

  const maxDaily = data
    ? Math.max(1, ...data.dailyActivity.map((d) => d.pageviews))
    : 1;

  return (
    <div className="min-h-screen">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-100">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Krest</span>
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/docs" className="text-zinc-300 hover:text-white">
              Docs
            </Link>
            <Link href="/dashboard" className="text-zinc-300 hover:text-white">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-400 mb-1">
              <ShieldCheck className="h-3.5 w-3.5" />
              Opt-In Anonymized Rollup
            </div>
            <h1 className="text-2xl font-bold text-zinc-50">Stellar Ecosystem Adoption</h1>
            <p className="text-sm text-zinc-400 mt-1">
              Aggregated usage across participating Stellar projects. Zero individual project leaks or PII.
            </p>
          </div>
          <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs">
            {(["7d", "30d", "90d"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                  range === r ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="mt-10 text-sm text-zinc-400">Loading live ecosystem metrics...</div>
        ) : data ? (
          <>
            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Participating Projects" value={data.summary.participatingProjects} />
              <StatCard label="Ecosystem Visitors" value={data.summary.totalVisitors} />
              <StatCard label="Confirmed Stellar Txs" value={data.summary.totalTxConfirmed} />
              <StatCard
                label="API Requests"
                value={data.summary.totalApiRequests}
                sub={`Avg ${data.summary.avgApiLatencyMs}ms`}
              />
            </div>

            <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
              <h2 className="text-sm font-semibold text-zinc-200 mb-4">Daily Ecosystem Pageviews</h2>
              {data.dailyActivity.length === 0 ? (
                <p className="text-sm text-zinc-500">
                  No opted-in ecosystem events recorded in this time window yet.
                </p>
              ) : (
                <div className="flex items-end gap-1.5 h-44">
                  {data.dailyActivity.map((d) => (
                    <div key={d.bucket} className="flex-1 flex flex-col items-center gap-1 group">
                      <div
                        className="w-full rounded-t bg-emerald-500/80 group-hover:bg-emerald-400 transition-colors"
                        style={{ height: `${Math.max(4, (d.pageviews / maxDaily) * 100)}%` }}
                        title={`${new Date(d.bucket).toLocaleDateString()}: ${d.pageviews} views (${d.visitors} visitors)`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="text-sm font-semibold text-zinc-200 mb-4">Wallet Share</h2>
                {data.walletShare.length === 0 ? (
                  <p className="text-sm text-zinc-500">No wallet connection events yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.walletShare.map((w) => (
                      <div key={w.wallet} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-200">{w.wallet}</span>
                        <span className="font-mono text-zinc-400">{w.connections}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <h2 className="text-sm font-semibold text-zinc-200 mb-4">Network Distribution</h2>
                {data.networkShare.length === 0 ? (
                  <p className="text-sm text-zinc-500">No network events yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {data.networkShare.map((n) => (
                      <div key={n.network} className="flex items-center justify-between text-sm">
                        <span className="text-zinc-200 capitalize">{n.network}</span>
                        <span className="font-mono text-zinc-400">{n.events}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1.5 text-2xl font-bold text-zinc-50 font-mono">
        {value.toLocaleString()}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}
