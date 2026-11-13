"use client";

import { useState } from "react";
import Link from "next/link";
import { Activity, BookOpen, ShieldCheck, Globe, Coins, Server, Terminal } from "lucide-react";
import { getApiUrl } from "@/lib/api";

type Section = "quickstart" | "privacy" | "web-sdk" | "api-middleware" | "rest-api";

export default function DocsPage() {
  const [section, setSection] = useState<Section>("quickstart");
  let apiUrl = "https://api-krest.kellon.xyz";
  try {
    apiUrl = getApiUrl();
  } catch {
    // Fallback only if env is unset during static build
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-semibold text-zinc-100">
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>Krest</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/docs" className="text-zinc-100 font-medium">
              Docs
            </Link>
            <Link href="/ecosystem" className="hover:text-zinc-100">
              Ecosystem
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-zinc-100 px-3.5 py-1.5 font-medium text-zinc-950 hover:bg-zinc-200"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1 mx-auto max-w-6xl w-full px-6 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <aside className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-wider text-zinc-500 px-3 mb-2">
            Documentation
          </div>
          <NavBtn
            active={section === "quickstart"}
            onClick={() => setSection("quickstart")}
            icon={<BookOpen className="h-4 w-4" />}
            label="Quickstart"
          />
          <NavBtn
            active={section === "privacy"}
            onClick={() => setSection("privacy")}
            icon={<ShieldCheck className="h-4 w-4" />}
            label="Privacy & Security"
          />
          <NavBtn
            active={section === "web-sdk"}
            onClick={() => setSection("web-sdk")}
            icon={<Globe className="h-4 w-4" />}
            label="Web & Stellar SDK"
          />
          <NavBtn
            active={section === "api-middleware"}
            onClick={() => setSection("api-middleware")}
            icon={<Server className="h-4 w-4" />}
            label="API Middleware"
          />
          <NavBtn
            active={section === "rest-api"}
            onClick={() => setSection("rest-api")}
            icon={<Terminal className="h-4 w-4" />}
            label="REST API Reference"
          />
        </aside>

        <main className="md:col-span-3 space-y-6">
          {section === "quickstart" && (
            <DocCard title="Quickstart Guide" icon={<BookOpen className="h-5 w-5 text-emerald-400" />}>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Get privacy-first Web, Stellar dApp, and API telemetry running in under 2 minutes:
              </p>
              <ol className="list-decimal list-inside space-y-2.5 text-sm text-zinc-300">
                <li>
                  Create an account at{" "}
                  <Link href="/login" className="text-emerald-400 hover:underline">
                    /login
                  </Link>
                  .
                </li>
                <li>
                  In{" "}
                  <Link href="/dashboard" className="text-emerald-400 hover:underline">
                    /dashboard
                  </Link>
                  , click <strong>New Project</strong>. Krest generates a Public Write Key (
                  <code className="text-emerald-300">pk_live_...</code>) and a Secret API Key (
                  <code className="text-amber-300">sk_live_...</code>, shown once).
                </li>
                <li>
                  Paste the 1-line script from <strong>Install &amp; Settings</strong> into your
                  website&apos;s <code className="text-zinc-200">&lt;head&gt;</code>:
                </li>
              </ol>
              <CodeBlock
                code={`<script defer src="${apiUrl}/krest.js" data-krest-key="pk_live_your_key"></script>`}
              />
              <p className="text-xs text-zinc-400">
                Pageviews, SPA route transitions, referrers, UTM tags, devices, and countries appear
                immediately in your dashboard.
              </p>
            </DocCard>
          )}

          {section === "privacy" && (
            <DocCard title="Privacy & Security Model" icon={<ShieldCheck className="h-5 w-5 text-emerald-400" />}>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Krest is designed from the ground up so you never need cookie banners or invasive tracking:
              </p>
              <ul className="space-y-3 text-sm text-zinc-300">
                <li>
                  <strong className="text-zinc-100">Zero Cookies &amp; LocalStorage:</strong>{" "}
                  The browser SDK stores nothing on the user&apos;s device.
                </li>
                <li>
                  <strong className="text-zinc-100">Daily Rotating Salts:</strong>{" "}
                  Every UTC day, Krest generates a fresh 32-byte salt in PostgreSQL and purges salts
                  older than 2 days. Visitor hashes are computed in memory as{" "}
                  <code className="text-emerald-300">HMAC-SHA256(dailySalt, projectId + ip + ua)</code>{" "}
                  and raw IPs and User-Agents are immediately discarded.
                </li>
                <li>
                  <strong className="text-zinc-100">No Raw Wallet Addresses:</strong>{" "}
                  Stellar telemetry tracks wallet providers (Freighter, xBull, Albedo, Lobstr),
                  networks, transaction stages, and contract IDs without logging user public keys.
                </li>
                <li>
                  <strong className="text-zinc-100">Opt-In SCF Rollup:</strong>{" "}
                  Projects only contribute anonymized counts to{" "}
                  <Link href="/ecosystem" className="text-emerald-400 hover:underline">
                    /ecosystem
                  </Link>{" "}
                  when explicitly opted in.
                </li>
              </ul>
            </DocCard>
          )}

          {section === "web-sdk" && (
            <DocCard title="Web & Stellar SDK (@krest/sdk-web)" icon={<Coins className="h-5 w-5 text-sky-400" />}>
              <h3 className="text-sm font-semibold text-zinc-100">1. Script Tag</h3>
              <CodeBlock
                code={`<script\n  defer\n  src="${apiUrl}/krest.js"\n  data-krest-key="pk_live_your_key"\n  data-krest-dnt="true"\n></script>`}
              />
              <h3 className="text-sm font-semibold text-zinc-100 pt-2">2. Stellar Wallet &amp; Transaction Funnels</h3>
              <p className="text-sm text-zinc-400">
                Available on <code className="text-zinc-200">window.krest</code> when using the script tag, or via{" "}
                <code className="text-zinc-200">import &#123; krest &#125; from &quot;@krest/sdk-web&quot;</code>:
              </p>
              <CodeBlock
                code={`// Track wallet connection\nkrest.trackWalletConnect({\n  walletName: "Freighter",\n  network: "mainnet",\n});\n\n// Track transaction funnel stages: "initiated" | "signed" | "submitted" | "confirmed" | "failed"\nkrest.trackTx({\n  stage: "initiated",\n  network: "mainnet",\n  contractId: "CABC...XYZ",\n});\n\n// Track custom events\nkrest.trackEvent("swap_completed", { pair: "XLM/USDC" });`}
              />
            </DocCard>
          )}

          {section === "api-middleware" && (
            <DocCard title="API & RPC Middleware (@krest/middleware-node)" icon={<Server className="h-5 w-5 text-amber-400" />}>
              <h3 className="text-sm font-semibold text-zinc-100">Express / Connect</h3>
              <CodeBlock
                code={`import { krestExpressMiddleware } from "@krest/middleware-node";\n\napp.use(krestExpressMiddleware({\n  secretKey: process.env.KREST_SECRET_KEY!,\n  endpoint: "${apiUrl}",\n  ignorePaths: ["/health"],\n}));`}
              />
              <h3 className="text-sm font-semibold text-zinc-100 pt-2">Next.js App Router</h3>
              <CodeBlock
                code={`import { withKrestApi } from "@krest/middleware-node";\n\nexport const GET = withKrestApi(async (req) => {\n  return Response.json({ ok: true });\n}, {\n  secretKey: process.env.KREST_SECRET_KEY!,\n  endpoint: "${apiUrl}",\n  route: "/api/quote",\n});`}
              />
              <h3 className="text-sm font-semibold text-zinc-100 pt-2">Custom / Soroban RPC Telemetry</h3>
              <CodeBlock
                code={`import { createKrestApiClient } from "@krest/middleware-node";\n\nconst client = createKrestApiClient({\n  secretKey: process.env.KREST_SECRET_KEY!,\n  endpoint: "${apiUrl}",\n});\n\nclient.record({\n  method: "POST",\n  route: "/soroban/rpc",\n  statusCode: 200,\n  latencyMs: 38,\n  network: "mainnet",\n  rpcMethod: "simulateTransaction",\n  contractId: "CABC...XYZ",\n});`}
              />
            </DocCard>
          )}

          {section === "rest-api" && (
            <DocCard title="REST API Reference" icon={<Terminal className="h-5 w-5 text-emerald-400" />}>
              <p className="text-sm text-zinc-400">
                Base URL: <code className="text-zinc-200">{apiUrl}</code>
              </p>
              <div className="space-y-2 text-xs font-mono">
                <EndpointRow method="GET" path="/health" desc="PostgreSQL connectivity check" />
                <EndpointRow method="GET" path="/krest.js" desc="Minified @krest/sdk-web browser bundle" />
                <EndpointRow method="POST" path="/v1/auth/signup" desc="Create account ({ name, email, password })" />
                <EndpointRow method="POST" path="/v1/auth/login" desc="Sign in ({ email, password })" />
                <EndpointRow method="GET" path="/v1/projects" desc="List authenticated user projects" />
                <EndpointRow method="POST" path="/v1/projects" desc="Create project and mint pk_live_ / sk_live_ keys" />
                <EndpointRow method="POST" path="/v1/ingest/web" desc="Ingest web & Stellar events (x-krest-key: pk_live_...)" />
                <EndpointRow method="POST" path="/v1/ingest/api" desc="Ingest API & RPC events (x-krest-key: sk_live_...)" />
                <EndpointRow method="GET" path="/v1/projects/:id/analytics?range=7d" desc="Query Web, Stellar, and API metrics" />
                <EndpointRow method="GET" path="/v1/ecosystem?range=30d" desc="Public opt-in SCF ecosystem rollup" />
              </div>
            </DocCard>
          )}
        </main>
      </div>
    </div>
  );
}

function NavBtn({
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
      className={`w-full flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors text-left ${
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

function DocCard({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 sm:p-8 space-y-4">
      <div className="flex items-center gap-2.5 border-b border-zinc-800 pb-4">
        {icon}
        <h1 className="text-xl font-bold text-zinc-50">{title}</h1>
      </div>
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-xs font-mono text-emerald-300 overflow-x-auto leading-relaxed">
      {code}
    </pre>
  );
}

function EndpointRow({ method, path, desc }: { method: string; path: string; desc: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-lg border border-zinc-800/80 bg-zinc-950 px-3.5 py-2.5">
      <span className="text-emerald-400 font-semibold w-14 shrink-0">{method}</span>
      <span className="text-zinc-100 w-64 shrink-0">{path}</span>
      <span className="text-zinc-400 font-sans">{desc}</span>
    </div>
  );
}
