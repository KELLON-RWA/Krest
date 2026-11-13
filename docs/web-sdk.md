# Web & Stellar SDK Guide (`@krest/sdk-web`)

## Option A: One-Line `<script>` Tag (Recommended for Websites)

Copy your snippet from **Dashboard → Install & Settings** and place it in `<head>`:

```html
<script
  defer
  src="https://api-krest.kellon.xyz/krest.js"
  data-krest-key="pk_live_your_public_key"
></script>
```

Optional attributes:
- `data-krest-dnt="true"` — Respects the browser's `Do Not Track` signal (`"1"` or legacy `"yes"`).
- `data-krest-endpoint="https://..."` — Overrides the ingestion endpoint (defaults to the script's origin).

This automatically tracks:
- Initial pageviews
- SPA route changes (`history.pushState` and `popstate`)
- Referrer domains and UTM query parameters (`utm_source`, `utm_medium`, `utm_campaign`)
- Batched delivery via `navigator.sendBeacon` on tab hide/unload

When loaded via `<script>`, `window.krest` is available globally for Stellar & custom events.

---

## Option B: npm Package (React, Next.js, TypeScript dApps)

Install from the workspace or npm:

```bash
pnpm add @krest/sdk-web
```

Initialize once in your app's root client provider:

```ts
import { krest } from "@krest/sdk-web";

krest.init({
  publicKey: "pk_live_your_public_key",
  endpoint: "https://api-krest.kellon.xyz",
  autoTrackPageviews: true,
  respectDnt: false,
});
```

### Tracking Stellar Wallet Connections

```ts
krest.trackWalletConnect({
  walletName: "Freighter",
  network: "mainnet", // "mainnet" | "testnet" | "futurenet" | "standalone"
});
```

### Tracking Stellar Transaction Funnels

```ts
// 1. User clicks Swap / Mint
krest.trackTx({
  stage: "initiated",
  network: "mainnet",
  contractId: "CABC...XYZ",
});

// 2. Wallet returns signed XDR
krest.trackTx({
  stage: "signed",
  network: "mainnet",
  contractId: "CABC...XYZ",
});

// 3. Horizon / Soroban RPC confirms
krest.trackTx({
  stage: "confirmed",
  network: "mainnet",
  contractId: "CABC...XYZ",
});

// Or on error:
krest.trackTx({
  stage: "failed",
  network: "mainnet",
  contractId: "CABC...XYZ",
  properties: { reason: "insufficient_balance" },
});
```

### Tracking Custom Events

```ts
krest.trackEvent("pool_deposit", {
  asset: "USDC",
  amountBucket: "100-1000",
});
```
