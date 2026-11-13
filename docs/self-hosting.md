# Self-Hosting & Deployment Guide

Krest is split into two deployable apps backed by PostgreSQL:
1. **`apps/api`** — Fastify + Drizzle ORM server (VPS / Docker)
2. **`apps/web`** — Next.js App Router dashboard (Vercel / Node)

---

## 1. Database (Neon PostgreSQL)
Create a PostgreSQL database (e.g., on Neon) and obtain the pooled `DATABASE_URL`.
From the repo root with `apps/api/.env` configured:

```bash
# Production: apply tracked migrations
pnpm db:migrate

# Local throwaway databases only
pnpm db:push
```

When changing `apps/api/src/db/schema.ts`, run `pnpm db:generate` and commit the
generated `apps/api/drizzle/` files.

---

## 2. Backend (`apps/api` on VPS)

```bash
git clone https://github.com/KELLON-RWA/Krest.git /opt/krest
cd /opt/krest
pnpm install
pnpm --filter @krest/sdk-web build
pnpm --filter @krest/api build
```

Create `/opt/krest/apps/api/.env`:

```env
NODE_ENV=production
PORT=4100
HOST=127.0.0.1
DATABASE_URL=postgresql://...
CORS_ORIGIN=https://krest.kellon.xyz
COOKIE_DOMAIN=.kellon.xyz
TRUST_PROXY=true
EVENT_RETENTION_DAYS=90
```

- `CORS_ORIGIN` is enforced for credentialed dashboard routes (comma-separate multiple origins).
- `TRUST_PROXY=true` is required so `visitorHash` uses the client IP, not the proxy IP.
- `EVENT_RETENTION_DAYS` controls the daily purge of raw events (`0` keeps them forever).

Start with PM2:

```bash
pm2 start /opt/krest/apps/api/dist/index.js --name krest-api --cwd /opt/krest/apps/api
pm2 save
```

Proxy via Nginx + Certbot:

```nginx
server {
    listen 80;
    server_name api-krest.kellon.xyz;

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

```bash
sudo certbot --nginx -d api-krest.kellon.xyz --redirect
```

---

## 3. Frontend (`apps/web` on Vercel)
1. Import the repository in Vercel and set **Root Directory** to `apps/web`.
2. Add Environment Variable:
   - `NEXT_PUBLIC_API_URL=https://api-krest.kellon.xyz`
3. Attach your custom domain (`krest.kellon.xyz`).
