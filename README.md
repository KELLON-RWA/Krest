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

1. Copy `.env.example` to `apps/api/.env` and `apps/web/.env.local` and fill in your Neon `DATABASE_URL`.
2. Install and build packages:
   ```bash
   pnpm install
   pnpm build
   ```
3. Apply the database schema (use `db:push` only for disposable local databases):
   ```bash
   pnpm db:push
   ```
4. Run API (port `4100`) and Web (port `3000`) in separate terminals:
   ```bash
   pnpm dev:api
   pnpm dev:web
   ```

## Production Deployment

Canonical hosts: dashboard `krest.kellon.xyz`, API/SDK `api-krest.kellon.xyz`.

### 1. Backend (`apps/api` on VPS at `api-krest.kellon.xyz`)

Generate and apply migrations against your production database:
```bash
pnpm db:generate   # when the schema changes, commit apps/api/drizzle/
pnpm db:migrate
```

Set environment variables on your VPS:
```env
NODE_ENV=production
PORT=4100
HOST=127.0.0.1
DATABASE_URL=postgresql://... # Neon pooled URL
CORS_ORIGIN=https://krest.kellon.xyz
COOKIE_DOMAIN=.kellon.xyz
TRUST_PROXY=true
EVENT_RETENTION_DAYS=90
```
`CORS_ORIGIN` is enforced for credentialed dashboard routes; public ingestion is open by design. `TRUST_PROXY=true` is required behind a reverse proxy so visitor hashes see real client IPs.

Run with Docker (`apps/api/Dockerfile`) or Node 22 + PM2, behind Caddy:
```caddyfile
api-krest.kellon.xyz {
    reverse_proxy localhost:4100
}
```

### 2. Frontend (`apps/web` on Vercel at `krest.kellon.xyz`)
- Root Directory: `apps/web`
- Build Command: `pnpm --filter @krest/web build`
- Env Var: `NEXT_PUBLIC_API_URL=https://api-krest.kellon.xyz`
