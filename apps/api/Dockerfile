FROM node:22-alpine AS builder
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/sdk-web/package.json packages/sdk-web/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --filter @krest/sdk-web --filter @krest/api

COPY packages/sdk-web packages/sdk-web
COPY apps/api apps/api

RUN pnpm --filter @krest/sdk-web build && pnpm --filter @krest/api build

FROM node:22-alpine AS runner
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app
ENV NODE_ENV=production

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/sdk-web/package.json packages/sdk-web/
COPY apps/api/package.json apps/api/

RUN pnpm install --prod --frozen-lockfile --filter @krest/sdk-web --filter @krest/api

COPY --from=builder /app/apps/api/dist apps/api/dist
COPY --from=builder /app/packages/sdk-web/dist packages/sdk-web/dist

USER node
EXPOSE 4100
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- "http://127.0.0.1:${PORT:-4100}/health" >/dev/null 2>&1 || exit 1
CMD ["node", "apps/api/dist/index.js"]
