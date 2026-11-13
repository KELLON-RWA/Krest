# REST API Reference

Base URL: `https://api-krest.kellon.xyz`

## Health & SDK
- `GET /` — Service metadata (`{"service":"krest-api","status":"ok","health":"/health","sdk":"/krest.js"}`)
- `GET /health` — Database connectivity check (`200` or `503`)
- `GET /krest.js` — Serves the minified `@krest/sdk-web` browser bundle (`application/javascript`)

## Authentication
Session cookies (`krest_session`, `HttpOnly; Secure; SameSite=Lax`) or `Authorization: Bearer <token>`.

- `POST /v1/auth/signup` — Body: `{ name, email, password }`
- `POST /v1/auth/login` — Body: `{ email, password }`
- `POST /v1/auth/logout` — Invalidates current session
- `GET /v1/auth/me` — Returns `{ user: { id, email, name } }`

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
  - Returns: `202 Accepted` `{ accepted }`
- `POST /v1/ingest/api`
  - Auth: `x-krest-key: sk_live_...` header
  - Body: `{ events: ApiEvent[] }` (1–100 events per batch)
  - Returns: `202 Accepted` `{ accepted }`

## Analytics Queries
- `GET /v1/projects/:id/analytics?range=24h|7d|30d|90d` (Authenticated)
  - Returns `web` (`summary`, `series`, `topPages`, `topReferrers`, `countries`, `devices`, `browsers`, `stellar`) and `api` (`summary` with `p50`/`p95`/`p99`, `series`, `topRoutes`, `rpcMethods`).
- `GET /v1/ecosystem?range=7d|30d|90d` (Public)
  - Returns anonymized aggregates across projects where `shareWithEcosystem = true`.
