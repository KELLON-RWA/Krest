# Krest

Privacy-first Web, Stellar/Soroban, and API analytics platform.

- **Zero cookies, zero PII:** Ephemeral daily visitor hashes via `HMAC-SHA256(dailySalt, projectId + ip + ua)` with automatic daily salt rotation and purge. Raw IPs and User-Agents are never persisted.
- **Stellar-native telemetry:** Tracks wallet connections (`Freighter`, `xBull`, `Albedo`, `Lobstr`), networks (`mainnet`/`testnet`), transaction signing/confirmation funnels, and Soroban contract/RPC usage.
- **API & RPC telemetry:** Drop-in middleware measuring p50/p95/p99 latency, error rates, and route throughput.
- **Opt-in SCF Ecosystem Rollup:** Anonymized cross-project adoption metrics for participating Stellar projects.

## Architecture

- `apps/api` — Fastify + Drizzle ORM + PostgreSQL (Neon) backend (deployable to VPS)
- `apps/web` — Next.js App Router dashboard (deployable to Vercel)
- `packages/sdk-web` — Browser `<script>` + ESM/CJS SDK (`@krest/sdk-web`)
- `packages/middleware-node` — Node.js / Express / Next.js API telemetry middleware (`@krest/middleware-node`)

## Local Setup

1. Copy `.env.example` to `apps/api/.env` and `apps/web/.env.local` and fill in your Neon `DATABASE_URL` and `AUTH_SECRET`.
2. Install and build packages:
   ```bash
   pnpm install
   pnpm build
   ```
3. Push the Drizzle schema to Neon PostgreSQL:
   ```bash
   pnpm db:push
   ```
4. Run API and Web in separate terminals:
   ```bash
   pnpm dev:api
   pnpm dev:web
   ```

## Production Deployment

### 1. Backend (`apps/api` on VPS at `api.krest.kellon.xy`)
Set environment variables on your VPS:
```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0
DATABASE_URL=postgresql://... # Neon pooled URL
AUTH_SECRET=<random-64-char-hex>
CORS_ORIGIN=https://krest.kellon.xy
COOKIE_DOMAIN=.krest.kellon.xy
TRUST_PROXY=true
```
Run with Docker (`apps/api/Dockerfile`) or Node 22 + PM2, behind Caddy:
```caddyfile
api.krest.kellon.xy {
    reverse_proxy localhost:4000
}
```

### 2. Frontend (`apps/web` on Vercel at `krest.kellon.xy`)
- Root Directory: `apps/web`
- Build Command: `pnpm --filter @krest/web build`
- Env Var: `NEXT_PUBLIC_API_URL=https://api.krest.kellon.xy`
