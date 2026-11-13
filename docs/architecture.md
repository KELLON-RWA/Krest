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
     - `sessionHash = HMAC-SHA256(dailySalt, "session:" + visitorHash + ":" + thirtyMinBucket)`
   - Raw IP addresses and raw User-Agent strings are **immediately discarded** and never written to PostgreSQL.
   - Because the salt rotates every UTC day, visitors cannot be tracked or linked across days.
3. **Zero Cookies on Tracked Sites:**
   - `@krest/sdk-web` sets zero cookies and writes nothing to `localStorage` or `sessionStorage`.
4. **Hashed API Consumers:**
   - `@krest/middleware-node` hashes optional consumer identifiers (`x-api-key` or `x-consumer-id`) with SHA-256 before sending telemetry, so raw API keys never leave your server.
