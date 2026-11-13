"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Activity,
  Plus,
  LogOut,
  RefreshCw,
  Copy,
  Check,
  KeyRound,
  Settings,
  Globe,
  Server,
  Coins,
} from "lucide-react";
import {
  apiFetch,
  getApiUrl,
  type Project,
  type ProjectAnalytics,
  type User,
} from "@/lib/api";

type Tab = "web" | "stellar" | "api" | "settings";
type Range = "24h" | "7d" | "30d" | "90d";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [range, setRange] = useState<Range>("7d");
  const [tab, setTab] = useState<Tab>("web");
  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newOrigins, setNewOrigins] = useState("");
  const [newShare, setNewShare] = useState(true);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadProjects = useCallback(async () => {
    const res = await apiFetch<{ projects: Project[] }>("/v1/projects");
    setProjects(res.projects);
    if (res.projects.length > 0 && !selectedId) {
      setSelectedId(res.projects[0].id);
    }
  }, [selectedId]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const me = await apiFetch<{ user: User }>("/v1/auth/me");
        if (!active) return;
        setUser(me.user);
        await loadProjects();
      } catch {
        if (active) router.replace("/login");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router, loadProjects]);

  const loadAnalytics = useCallback(async () => {
    if (!selectedId) {
      setAnalytics(null);
      return;
    }
    setLoadingAnalytics(true);
    setError(null);
    try {
      const data = await apiFetch<ProjectAnalytics>(
        `/v1/projects/${selectedId}/analytics?range=${range}`
      );
      setAnalytics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoadingAnalytics(false);
    }
  }, [selectedId, range]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const origins = newOrigins
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiFetch<{ project: Project; secretKey: string }>("/v1/projects", {
        method: "POST",
        body: JSON.stringify({
          name: newName,
          allowedOrigins: origins,
          shareWithEcosystem: newShare,
        }),
      });
      setProjects((prev) => [res.project, ...prev]);
      setSelectedId(res.project.id);
      setRevealedSecret(res.secretKey);
      setNewName("");
      setNewOrigins("");
      setShowCreate(false);
      setTab("settings");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project");
    }
  }

  async function handleLogout() {
    await apiFetch("/v1/auth/logout", { method: "POST" }).catch(() => {});
    router.replace("/login");
  }

  async function handleToggleEcosystem(project: Project) {
    try {
      const res = await apiFetch<{ project: Project }>(`/v1/projects/${project.id}`, {
        method: "PATCH",
        body: JSON.stringify({ shareWithEcosystem: !project.shareWithEcosystem }),
      });
      setProjects((prev) => prev.map((p) => (p.id === project.id ? res.project : p)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update setting");
    }
  }

  async function handleRotateKeys(project: Project) {
    try {
      const res = await apiFetch<{ project: Project; secretKey: string }>(
        `/v1/projects/${project.id}/rotate-keys`,
        { method: "POST" }
      );
      setProjects((prev) => prev.map((p) => (p.id === project.id ? res.project : p)));
      setRevealedSecret(res.secretKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to rotate keys");
    }
  }

  function copyText(id: string, value: string) {
    void navigator.clipboard.writeText(value);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 1800);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-zinc-400">
        Loading workspace...
      </div>
    );
  }

  const selectedProject = projects.find((p) => p.id === selectedId) ?? null;
  const apiUrl = getApiUrl();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-100">
              <Activity className="h-5 w-5 text-emerald-400" />
              <span>Krest</span>
            </Link>
            {projects.length > 0 && (
              <select
                value={selectedId ?? ""}
                onChange={(e) => {
                  setSelectedId(e.target.value);
                  setRevealedSecret(null);
                }}
                className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-emerald-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" /> New Project
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <Link href="/ecosystem" className="hover:text-zinc-200">
              Ecosystem
            </Link>
            <span className="hidden sm:inline text-zinc-500">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1 text-zinc-400 hover:text-zinc-100"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl px-6 py-8 w-full">
        {error && (
          <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-300">
            {error}
          </div>
        )}

        {revealedSecret && (
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-semibold text-amber-300">
                Save your Secret API Key now — it will not be shown again
              </div>
              <button
                onClick={() => copyText("secret", revealedSecret)}
                className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2.5 py-1 text-xs text-amber-200 hover:bg-amber-500/30"
              >
                {copiedKey === "secret" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                Copy
              </button>
            </div>
            <code className="mt-2 block font-mono text-xs text-amber-100 break-all">
              {revealedSecret}
            </code>
          </div>
        )}

        {!selectedProject ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-12 text-center">
            <h2 className="text-lg font-semibold text-zinc-100">Create your first project</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Generate a public write key for your website and a secret key for your API middleware.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 hover:bg-emerald-400"
            >
              <Plus className="h-4 w-4" /> Create Project
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center gap-2 border-b sm:border-b-0 border-zinc-800 pb-2 sm:pb-0">
                <TabButton active={tab === "web"} onClick={() => setTab("web")} icon={<Globe className="h-4 w-4" />} label="Web" />
                <TabButton active={tab === "stellar"} onClick={() => setTab("stellar")} icon={<Coins className="h-4 w-4" />} label="Stellar" />
                <TabButton active={tab === "api"} onClick={() => setTab("api")} icon={<Server className="h-4 w-4" />} label="API & RPC" />
                <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={<Settings className="h-4 w-4" />} label="Install & Settings" />
              </div>

              {tab !== "settings" && (
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-900 p-1 text-xs">
                    {(["24h", "7d", "30d", "90d"] as const).map((r) => (
                      <button
                        key={r}
                        onClick={() => setRange(r)}
                        className={`px-2.5 py-1 rounded font-medium ${
                          range === r ? "bg-zinc-800 text-zinc-50" : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => void loadAnalytics()}
                    disabled={loadingAnalytics}
                    className="rounded-lg border border-zinc-800 bg-zinc-900 p-2 text-zinc-400 hover:text-zinc-100"
                    title="Refresh"
                  >
                    <RefreshCw className={`h-4 w-4 ${loadingAnalytics ? "animate-spin" : ""}`} />
                  </button>
                </div>
              )}
            </div>

            {tab === "web" && analytics && <WebTab analytics={analytics} />}
            {tab === "stellar" && analytics && <StellarTab analytics={analytics} />}
            {tab === "api" && analytics && <ApiTab analytics={analytics} />}
            {tab === "settings" && (
              <SettingsTab
                project={selectedProject}
                apiUrl={apiUrl}
                copiedKey={copiedKey}
                onCopy={copyText}
                onToggleEcosystem={() => handleToggleEcosystem(selectedProject)}
                onRotateKeys={() => handleRotateKeys(selectedProject)}
              />
            )}
          </>
        )}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-900 p-6">
            <h2 className="text-lg font-semibold text-zinc-100">New Project</h2>
            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Kellon App"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">
                  Allowed Origins (comma-separated, optional)
                </label>
                <input
                  type="text"
                  value={newOrigins}
                  onChange={(e) => setNewOrigins(e.target.value)}
                  placeholder="https://app.example.com"
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <label className="flex items-start gap-2.5 text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={newShare}
                  onChange={(e) => setNewShare(e.target.checked)}
                  className="mt-0.5 accent-emerald-500"
                />
                <span>
                  Share anonymized aggregate metrics with the Stellar Ecosystem Rollup (opt-in)
                </span>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-zinc-700 px-3.5 py-2 text-xs text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-zinc-800 text-zinc-50"
          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
      <div className="text-xs text-zinc-400">{label}</div>
      <div className="mt-1.5 text-2xl font-bold font-mono text-zinc-50">
        {typeof value === "number" ? value.toLocaleString() : value}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

function WebTab({ analytics }: { analytics: ProjectAnalytics }) {
  const { summary, series, topPages, topReferrers, countries, devices } = analytics.web;
  const maxViews = Math.max(1, ...series.map((s) => s.pageviews));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Unique Visitors" value={summary.uniqueVisitors} />
        <KpiCard label="Pageviews" value={summary.totalPageviews} />
        <KpiCard label="Sessions" value={summary.totalSessions} />
        <KpiCard label="Wallet Connects" value={summary.walletConnects} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <h3 className="text-sm font-semibold text-zinc-200 mb-4">Traffic Over Time</h3>
        {series.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No web events yet. Add the tracking snippet from Install &amp; Settings to start collecting real data.
          </p>
        ) : (
          <div className="flex items-end gap-1.5 h-44">
            {series.map((point) => (
              <div key={point.bucket} className="flex-1 flex flex-col items-center justify-end h-full group">
                <div
                  className="w-full rounded-t bg-emerald-500/80 group-hover:bg-emerald-400 transition-colors"
                  style={{ height: `${Math.max(4, (point.pageviews / maxViews) * 100)}%` }}
                  title={`${new Date(point.bucket).toLocaleString()}: ${point.pageviews} views, ${point.visitors} visitors`}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <BreakdownCard
          title="Top Pages"
          emptyText="No pageviews recorded."
          rows={topPages.map((p) => ({ label: p.path, value: `${p.views} (${p.visitors} uniq)` }))}
        />
        <BreakdownCard
          title="Top Referrers"
          emptyText="No referrer data."
          rows={topReferrers.map((r) => ({ label: r.referrer, value: r.visits }))}
        />
        <BreakdownCard
          title="Countries"
          emptyText="No country data."
          rows={countries.map((c) => ({ label: c.country, value: c.visitors }))}
        />
        <BreakdownCard
          title="Devices"
          emptyText="No device data."
          rows={devices.map((d) => ({ label: d.device, value: d.visitors }))}
        />
      </div>
    </div>
  );
}

function StellarTab({ analytics }: { analytics: ProjectAnalytics }) {
  const { summary, stellar } = analytics.web;
  const confirmRate =
    summary.txInitiated > 0
      ? `${((summary.txConfirmed / summary.txInitiated) * 100).toFixed(1)}%`
      : "0%";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Wallet Connects" value={summary.walletConnects} />
        <KpiCard label="Txs Initiated" value={summary.txInitiated} />
        <KpiCard label="Txs Confirmed" value={summary.txConfirmed} sub={`Conversion: ${confirmRate}`} />
        <KpiCard label="Txs Failed" value={summary.txFailed} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <BreakdownCard
          title="Wallets Used"
          emptyText="No wallet_connect events yet."
          rows={stellar.wallets.map((w) => ({ label: w.wallet, value: w.connections }))}
        />
        <BreakdownCard
          title="Stellar Networks"
          emptyText="No network events yet."
          rows={stellar.networks.map((n) => ({ label: n.network, value: n.events }))}
        />
        <BreakdownCard
          title="Top Soroban Contracts"
          emptyText="No contract_id events yet."
          rows={stellar.contracts.map((c) => ({
            label: `${c.contractId.slice(0, 8)}...${c.contractId.slice(-6)}`,
            value: c.calls,
          }))}
        />
      </div>
    </div>
  );
}

function ApiTab({ analytics }: { analytics: ProjectAnalytics }) {
  const { summary, topRoutes, rpcMethods } = analytics.api;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard label="Total API Requests" value={summary.totalRequests} />
        <KpiCard label="Error Rate" value={`${summary.errorRate}%`} sub={`${summary.errorCount} errors`} />
        <KpiCard label="p50 / p95 Latency" value={`${summary.p50LatencyMs} / ${summary.p95LatencyMs}ms`} sub={`p99: ${summary.p99LatencyMs}ms`} />
        <KpiCard label="Unique Consumers" value={summary.uniqueConsumers} />
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 overflow-x-auto">
        <h3 className="text-sm font-semibold text-zinc-200 mb-4">Top API Routes</h3>
        {topRoutes.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No API telemetry recorded yet. Install @krest/middleware-node to track live endpoints.
          </p>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="text-zinc-400 border-b border-zinc-800">
              <tr>
                <th className="py-2 pr-4">Method</th>
                <th className="py-2 pr-4">Route</th>
                <th className="py-2 pr-4 text-right">Requests</th>
                <th className="py-2 pr-4 text-right">Errors</th>
                <th className="py-2 pr-4 text-right">Avg (ms)</th>
                <th className="py-2 text-right">p95 (ms)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono">
              {topRoutes.map((r) => (
                <tr key={`${r.method}:${r.route}`}>
                  <td className="py-2.5 pr-4 text-emerald-400">{r.method}</td>
                  <td className="py-2.5 pr-4 text-zinc-200">{r.route}</td>
                  <td className="py-2.5 pr-4 text-right text-zinc-300">{r.requests}</td>
                  <td className="py-2.5 pr-4 text-right text-red-400">{r.errors}</td>
                  <td className="py-2.5 pr-4 text-right text-zinc-300">{r.avg_latency_ms}</td>
                  <td className="py-2.5 text-right text-zinc-300">{r.p95_latency_ms}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <BreakdownCard
        title="Soroban / Horizon RPC Methods"
        emptyText="No rpcMethod tags recorded yet."
        rows={rpcMethods.map((m) => ({ label: m.rpcMethod, value: m.calls }))}
      />
    </div>
  );
}

function BreakdownCard({
  title,
  emptyText,
  rows,
}: {
  title: string;
  emptyText: string;
  rows: Array<{ label: string; value: string | number }>;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
      <h3 className="text-sm font-semibold text-zinc-200 mb-4">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-500">{emptyText}</p>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r, idx) => (
            <div key={`${r.label}-${idx}`} className="flex items-center justify-between text-xs gap-4">
              <span className="text-zinc-200 truncate">{r.label}</span>
              <span className="font-mono text-zinc-400 shrink-0">{r.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SettingsTab({
  project,
  apiUrl,
  copiedKey,
  onCopy,
  onToggleEcosystem,
  onRotateKeys,
}: {
  project: Project;
  apiUrl: string;
  copiedKey: string | null;
  onCopy: (id: string, value: string) => void;
  onToggleEcosystem: () => void;
  onRotateKeys: () => void;
}) {
  const scriptSnippet = `<script defer src="${apiUrl}/krest.js" data-krest-key="${project.publicKey}"></script>`;
  const middlewareSnippet = `import { krestExpressMiddleware } from "@krest/middleware-node";\n\napp.use(krestExpressMiddleware({\n  secretKey: process.env.KREST_SECRET_KEY!,\n  endpoint: "${apiUrl}",\n}));`;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-200">1. Website Tracking Snippet</h3>
          <button
            onClick={() => onCopy("script", scriptSnippet)}
            className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            {copiedKey === "script" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy
          </button>
        </div>
        <pre className="rounded-lg bg-zinc-950 border border-zinc-800 p-3.5 text-xs font-mono text-emerald-300 overflow-x-auto">
          {scriptSnippet}
        </pre>

        <div className="flex items-center justify-between pt-2">
          <h3 className="text-sm font-semibold text-zinc-200">2. Node.js / Express API Middleware</h3>
          <button
            onClick={() => onCopy("mw", middlewareSnippet)}
            className="inline-flex items-center gap-1 rounded border border-zinc-700 px-2.5 py-1 text-xs text-zinc-300 hover:bg-zinc-800"
          >
            {copiedKey === "mw" ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            Copy
          </button>
        </div>
        <pre className="rounded-lg bg-zinc-950 border border-zinc-800 p-3.5 text-xs font-mono text-sky-300 overflow-x-auto">
          {middlewareSnippet}
        </pre>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-200">Project Keys &amp; Privacy</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5">
            <div className="text-zinc-400">Public Write Key</div>
            <div className="mt-1 font-mono text-zinc-100 break-all">{project.publicKey}</div>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-3.5">
            <div className="text-zinc-400">Secret Key Prefix</div>
            <div className="mt-1 font-mono text-zinc-100">{project.secretKeyPrefix}••••••••</div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-zinc-800">
          <div>
            <div className="text-sm font-medium text-zinc-200">
              SCF Ecosystem Rollup Opt-In
            </div>
            <div className="text-xs text-zinc-400">
              Contribute anonymized aggregate counts to the public Stellar ecosystem dashboard.
            </div>
          </div>
          <button
            onClick={onToggleEcosystem}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold ${
              project.shareWithEcosystem
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-zinc-800 text-zinc-300"
            }`}
          >
            {project.shareWithEcosystem ? "Opted In" : "Opted Out"}
          </button>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
          <div>
            <div className="text-sm font-medium text-zinc-200">Rotate Project Keys</div>
            <div className="text-xs text-zinc-400">
              Immediately invalidates the current public and secret keys.
            </div>
          </div>
          <button
            onClick={onRotateKeys}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3.5 py-1.5 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
          >
            <KeyRound className="h-3.5 w-3.5" /> Rotate Keys
          </button>
        </div>
      </div>
    </div>
  );
}
