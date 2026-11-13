# Features Overview

## 1. Privacy-First Web Analytics
- **Cookie-less & Zero PII:** No cookies, no localStorage tracking IDs, and no raw IP addresses or User-Agent strings stored in the database.
- **Traffic & Engagement:** Unique visitors, total pageviews, 30-minute fixed-window sessions, and hourly/daily time-series charts. Unique visitors are per-day/per-project because hashes rotate with the daily salt.
- **Acquisition & Environment:** Top pages, referrer domains, UTM parameters (`utm_source`, `utm_medium`, `utm_campaign`), country codes (via trusted edge proxy headers), device types, browsers, and operating systems.
- **Automatic Bot Filtering:** Filters crawlers, headless browsers, and CLI user agents before persistence.
- **Bounded Retention:** Raw events older than `EVENT_RETENTION_DAYS` (default 90) are purged automatically.

## 2. Stellar & Soroban Telemetry
- **Wallet Breakdown:** Track connections across Stellar wallets (e.g., Freighter, xBull, Albedo, Lobstr, Rabet) without storing user public keys (`G...`).
- **Network Split:** Separate metrics across `mainnet`, `testnet`, `futurenet`, and `standalone`.
- **Transaction Funnel:** Measure conversion across `initiated` → `signed` → `submitted` → `confirmed` / `failed`.
- **Soroban Contract Usage:** Track call volume by `contractId`.

## 3. API & RPC Monitoring
- **Real Latency Percentiles:** Computes `avg`, `p50`, `p95`, and `p99` response latency directly in PostgreSQL (`PERCENTILE_CONT`).
- **Error Tracking:** Monitors 4xx/5xx error counts, error rates, and categorized error types.
- **Route & Consumer Insights:** Per-route request volume, latency, and keyed-pseudonymous unique consumer counts (`consumerHash` via secret-keyed HMAC-SHA256).
- **RPC Method Breakdown:** Track Stellar Horizon / Soroban RPC method call volume.
- **Per-key rate limits:** Ingestion is rate-limited per public key/IP and per secret key, in addition to the global per-IP limit.

## 4. Opt-In SCF Ecosystem Rollup
- Projects can toggle **Share with Ecosystem** (`shareWithEcosystem`) in **Install & Settings**.
- Participating projects contribute anonymized aggregate counts to the public `/ecosystem` dashboard (`GET /v1/ecosystem`)—giving ecosystem grant programs like the Stellar Community Fund (SCF) visibility into aggregate adoption without exposing individual project secrets or user data.
- All ecosystem metrics except `participatingProjects` honor the requested `range`; `participatingProjects` counts projects with web or API activity inside that range. Because visitor hashes are project-scoped, ecosystem visitor totals sum per-project uniques and do not deduplicate a person across projects.

## 5. Multi-Project & Key Management
- Create multiple projects per account.
- Each project receives:
  - A **Public Write Key** (`pk_live_...`) for browser telemetry (`POST /v1/ingest/web`). If `allowedOrigins` is configured, requests must carry a matching `Origin` header.
  - A **Secret API Key** (`sk_live_...`, hashed with SHA-256 in the database and shown once on creation/rotation) for server-side API telemetry (`POST /v1/ingest/api`).
- One-click key rotation in the dashboard immediately invalidates previous keys.
