# REST API Reference

Base URL: `https://api-krest.kellon.xyz`

## Health & SDK
- `GET /` — Service metadata (`{"service":"krest-api","status":"ok","health":"/health","sdk":"/krest.js"}`)
- `GET /health` — Database connectivity check (`200` or `503`)
- `GET /krest.js` — Serves the minified `@krest/sdk-web` browser bundle (`application/javascript`)

## Authentication
Session cookies (`krest_session`, `HttpOnly; Secure; SameSite=Lax`) or `Authorization: Bearer <token>`.

`POST /v1/auth/signup` and `POST /v1/auth/login` return the session token in the response body for non-browser clients. The dashboard relies on the HttpOnly cookie and never stores the token.

- `POST /v1/auth/signup` — Body: `{ name, email, password }`
- `POST /v1/auth/login` — Body: `{ email, password }`
- `POST /v1/auth/logout` — Invalidates current session
- `GET /v1/auth/me` — Returns `{ user: { id, email, name } }`

Auth endpoints are rate-limited per IP (signup: 10/min, login: 20/min).

## Projects (Authenticated)
- `GET /v1/projects` — List projects owned by the signed-in user
- `POST /v1/projects` — Create project (`{ name, allowedOrigins?, shareWithEcosystem? }`); returns `{ project, secretKey }` (`secretKey` shown once)
- `GET /v1/projects/:id` — Get single project details
- `PATCH /v1/projects/:id` — Update `name`, `allowedOrigins`, or `shareWithEcosystem`
- `POST /v1/projects/:id/rotate-keys` — Generates new `pk_live_...` and `sk_live_...`
- `DELETE /v1/projects/:id` — Deletes project and cascading events

## Event Ingestion
- `POST /v1/ingest/web`
  - Auth: `x-krest-key: pk_live_...` header or `publicKey` in JSON body
  - Body: `{ publicKey?, events: WebEvent[] }` (1–50 events per batch)
  - If the project has `allowedOrigins` configured, the request must include a matching `Origin` header (missing or mismatched origin → `403`).
  - Returns: `202 Accepted` `{ accepted }` (`accepted: 0` for filtered bots)
- `POST /v1/ingest/api`
  - Auth: `x-krest-key: sk_live_...` header
  - Body: `{ events: ApiEvent[] }` (1–100 events per batch)
  - Returns: `202 Accepted` `{ accepted }`

Both ingestion routes are rate-limited per key/IP (600 requests/min).

## Analytics Queries
- `GET /v1/projects/:id/analytics?range=24h|7d|30d|90d` (Authenticated)
  - Returns `web` (`summary`, `series`, `topPages`, `topReferrers`, `countries`, `devices`, `browsers`, `stellar`) and `api` (`summary` with `p50`/`p95`/`p99`, `series`, `topRoutes`, `rpcMethods`).
  - `uniqueVisitors` and `totalSessions` are sums of daily uniques because visitor hashes rotate with the daily salt.
  - Invalid project ids return `400`; unknown or unowned projects return `404`.
- `GET /v1/ecosystem?range=7d|30d|90d` (Public)
  - Returns anonymized aggregates across projects where `shareWithEcosystem = true`. Visitor totals are summed per project and are not deduplicated across projects.
