import Link from "next/link";
import { Activity, ShieldCheck, Server, Globe, ArrowRight, Terminal } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-semibold tracking-tight text-lg">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Activity className="h-4 w-4" />
            </span>
            <span>Krest</span>
          </div>
          <nav className="flex items-center gap-6 text-sm text-zinc-400">
            <Link href="/ecosystem" className="hover:text-zinc-100 transition-colors">
              Ecosystem Rollup
            </Link>
            <Link href="/login" className="hover:text-zinc-100 transition-colors">
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="rounded-md bg-zinc-100 px-3.5 py-1.5 font-medium text-zinc-950 hover:bg-zinc-200 transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1 mx-auto max-w-6xl px-6 py-20 w-full">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300 mb-6">
            <ShieldCheck className="h-3.5 w-3.5" />
            Cookie-less &bull; Daily Rotating Salts &bull; Zero PII
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-50 leading-tight">
            Privacy-first Web &amp; API analytics for the Stellar ecosystem.
          </h1>
          <p className="mt-5 text-lg text-zinc-400 leading-relaxed">
            Track real website visitors, wallet connection funnels, Soroban contract interactions,
            and API p50/p95/p99 latency without cookies or invasive tracking. Opt in to share
            anonymized adoption metrics with the Stellar Community Fund.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-emerald-400 transition-colors"
            >
              Get Started <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/ecosystem"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              View Ecosystem Rollup
            </Link>
          </div>
        </div>

        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <Globe className="h-5 w-5 text-emerald-400 mb-3" />
            <h2 className="font-semibold text-zinc-100">Privacy-First Web SDK</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              One-line script or npm package. Computes daily rotating HMAC visitor hashes in memory
              and discards raw IPs and User-Agents immediately.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <Terminal className="h-5 w-5 text-sky-400 mb-3" />
            <h2 className="font-semibold text-zinc-100">Stellar &amp; Soroban Funnels</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Measure Freighter, xBull, Albedo, and Lobstr connect rates alongside transaction
              signing and confirmation drop-offs across Mainnet and Testnet.
            </p>
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
            <Server className="h-5 w-5 text-amber-400 mb-3" />
            <h2 className="font-semibold text-zinc-100">API &amp; RPC Telemetry</h2>
            <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
              Drop-in Node.js, Express, and Next.js middleware measuring real route latency
              percentiles (p50/p95/p99), error rates, and RPC method volume.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
