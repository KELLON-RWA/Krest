# Architecture & Privacy Model

## System Topology

```text
Browser / Stellar dApp ──(pk_live_...)──▶ POST https://api-krest.kellon.xyz/v1/ingest/web
Node / Express / Next  ──(sk_live_...)──▶ POST https://api-krest.kellon.xyz/v1/ingest/api
                                                    │
                                                    ▼
                                         Fastify API (VPS :4100)
                                                    │
                                                    ▼
                                         Neon PostgreSQL (Drizzle ORM)
                                                    ▲
                                                    │
Dashboard (https://krest.kellon.xyz) ────(Cookie)───┘
```

## How Krest Protects User Privacy

1. **Daily Rotating Salts (`daily_salts` table):**
   - Each UTC day (`YYYY-MM-DD`), Krest generates a cryptographically random 32-byte salt.
   - Salts older than 2 days are automatically deleted.
2. **Ephemeral Visitor & Session Hashing:**
   - When a web event arrives, the API computes in memory:
     - `visitorHash = HMAC-SHA256(dailySalt, projectId + ":" + ip + ":" + userAgent)`
     - `sessionHash = HMAC-SHA256(dailySalt, "session:" + visitorHash + ":" + thirtyMinWindow)`
   - Raw IP addresses and raw User-Agent strings are **immediately discarded** and never written to PostgreSQL.
   - Because the salt rotates every UTC day, visitors cannot be tracked or linked across days.
3. **Zero Cookies on Tracked Sites:**
   - `@krest/sdk-web` sets zero cookies and writes nothing to `localStorage` or `sessionStorage`.
4. **Hashed API Consumers:**
   - `@krest/middleware-node` hashes optional consumer identifiers (`x-api-key` or `x-consumer-id`) with a **secret-keyed HMAC-SHA256** before sending telemetry, so raw API keys never leave your server and hashes cannot be correlated across projects.
   - Only an optional, coarse `x-stellar-sdk` value is stored as `sdkName`. The raw User-Agent is never sent or persisted.
5. **Bounded Retention:**
   - Raw events are deleted after `EVENT_RETENTION_DAYS` (default 90, `0` disables purge). Expired sessions are removed daily.

## What the privacy model intentionally gives up

- **Unique visitor counts cannot be deduplicated across days or projects.** The salt (and `projectId`) are part of the hash, so a "30-day unique visitor" figure is the sum of daily uniques, and ecosystem totals double-count a person active on multiple projects.
- **Sessions use fixed 30-minute windows**, not rolling windows. A session crossing a window boundary is counted twice. This keeps sessionization stateless and cookie-free.
- **Database-level trust:** while a day's salt exists, someone with read access to both the salt table and the event rows could brute-force low-entropy inputs (e.g. IPv4 addresses) against the hashes. Salts are deleted after two days, so this window is bounded.
- **Origin allowlists are abuse controls, not authentication.** Public write keys are public by design; per-project `allowedOrigins` only applies when a request carries an `Origin` header.
