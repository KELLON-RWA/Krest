# API Middleware Guide (`@krest/middleware-node`)

`@krest/middleware-node` is a zero-dependency telemetry client for Node.js (`>=20`). It batches events asynchronously in the background so telemetry never blocks or throws errors into your API responses.

```bash
pnpm add @krest/middleware-node
```

## 1. Express / Connect Middleware

```ts
import express from "express";
import { krestExpressMiddleware } from "@krest/middleware-node";

const app = express();

app.use(
  krestExpressMiddleware({
    secretKey: process.env.KREST_SECRET_KEY!,
    endpoint: "https://api-krest.kellon.xyz",
    ignorePaths: ["/health", "/favicon.ico"],
  })
);
```

What it captures automatically:
- HTTP `method` and matched `route` (query strings are stripped)
- `statusCode` and `latencyMs` (measured with `performance.now()`)
- `consumerHash` (secret-keyed HMAC-SHA256 of `x-api-key` or `x-consumer-id` if present—raw keys are never transmitted and hashes cannot be correlated across projects)
- `sdkName` (optional coarse `x-stellar-sdk` value only; the raw User-Agent is never sent or stored)
- `errorType` (`client_error` for 4xx, `server_error` for 5xx)

## 2. Next.js App Router Wrapper

```ts
import { NextResponse } from "next/server";
import { withKrestApi } from "@krest/middleware-node";

export const GET = withKrestApi(
  async (req: Request) => {
    return NextResponse.json({ ok: true });
  },
  {
    secretKey: process.env.KREST_SECRET_KEY!,
    endpoint: "https://api-krest.kellon.xyz",
    route: "/api/quote",
  }
);
```

## 3. Manual / Soroban RPC Client

Use `createKrestApiClient` to record custom backend or RPC operations:

```ts
import { createKrestApiClient } from "@krest/middleware-node";

const telemetry = createKrestApiClient({
  secretKey: process.env.KREST_SECRET_KEY!,
  endpoint: "https://api-krest.kellon.xyz",
});

telemetry.record({
  method: "POST",
  route: "/soroban/rpc",
  statusCode: 200,
  latencyMs: 42,
  network: "mainnet",
  rpcMethod: "simulateTransaction",
  contractId: "CABC...XYZ",
});

// Flush pending events before graceful shutdown
await telemetry.shutdown();
```
