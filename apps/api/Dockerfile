FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.28.2 --activate
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY packages/sdk-web/package.json packages/sdk-web/
COPY apps/api/package.json apps/api/

RUN pnpm install --frozen-lockfile --filter @krest/sdk-web --filter @krest/api

COPY packages/sdk-web packages/sdk-web
COPY apps/api apps/api

RUN pnpm --filter @krest/sdk-web build && pnpm --filter @krest/api build

ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "apps/api/dist/index.js"]
