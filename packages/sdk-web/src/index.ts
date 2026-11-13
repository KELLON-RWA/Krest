export type StellarNetwork = "mainnet" | "testnet" | "futurenet" | "standalone";
export type TxStage = "initiated" | "signed" | "submitted" | "confirmed" | "failed";

export interface KrestConfig {
  publicKey: string;
  endpoint: string;
  autoTrackPageviews?: boolean;
  respectDnt?: boolean;
  flushIntervalMs?: number;
}

export interface WebEventPayload {
  eventType: "pageview" | "custom" | "wallet_connect" | "tx_funnel";
  eventName?: string;
  path: string;
  referrerDomain?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  walletName?: string;
  network?: StellarNetwork;
  txStage?: TxStage;
  contractId?: string;
  properties?: Record<string, string | number | boolean>;
}

const MAX_BATCH = 20;

function doNotTrackEnabled(): boolean {
  if (typeof navigator === "undefined") return false;
  const legacy = (navigator as Navigator & { msDoNotTrack?: string }).msDoNotTrack;
  const dnt = navigator.doNotTrack ?? legacy;
  return dnt === "1" || dnt === "yes";
}

class KrestClient {
  private config: KrestConfig | null = null;
  private queue: WebEventPayload[] = [];
  private timer: ReturnType<typeof setTimeout> | null = null;
  private spaHooked = false;
  private lastPath = "";

  init(config: KrestConfig): void {
    if (typeof window === "undefined") return;
    if (!config.publicKey || !config.endpoint) {
      throw new Error("@krest/sdk-web: publicKey and endpoint are required");
    }

    if (config.respectDnt && doNotTrackEnabled()) {
      return;
    }

    this.config = {
      autoTrackPageviews: true,
      respectDnt: false,
      flushIntervalMs: 1500,
      ...config,
      endpoint: config.endpoint.replace(/\/+$/, ""),
    };

    if (this.config.autoTrackPageviews) {
      this.trackPageview();
      this.hookSpaNavigation();
    }

    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        this.flush(true);
      }
    });
    window.addEventListener("pagehide", () => this.flush(true));
  }

  trackPageview(customPath?: string): void {
    if (typeof window === "undefined" || !this.config) return;
    const path = customPath || window.location.pathname || "/";
    if (path === this.lastPath && !customPath) return;
    this.lastPath = path;

    const params = new URLSearchParams(window.location.search);
    let referrerDomain: string | undefined;
    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.hostname !== window.location.hostname) {
          referrerDomain = refUrl.hostname;
        }
      } catch {
        // Ignore malformed referrer
      }
    }

    this.enqueue({
      eventType: "pageview",
      path,
      referrerDomain,
      utmSource: params.get("utm_source") || undefined,
      utmMedium: params.get("utm_medium") || undefined,
      utmCampaign: params.get("utm_campaign") || undefined,
    });
  }

  trackEvent(
    eventName: string,
    properties?: Record<string, string | number | boolean>
  ): void {
    if (typeof window === "undefined" || !this.config) return;
    this.enqueue({
      eventType: "custom",
      eventName,
      path: window.location.pathname || "/",
      properties,
    });
  }

  trackWalletConnect(params: {
    walletName: string;
    network?: StellarNetwork;
  }): void {
    if (typeof window === "undefined" || !this.config) return;
    this.enqueue({
      eventType: "wallet_connect",
      eventName: "wallet_connect",
      path: window.location.pathname || "/",
      walletName: params.walletName,
      network: params.network || "mainnet",
    });
  }

  trackTx(params: {
    stage: TxStage;
    network?: StellarNetwork;
    contractId?: string;
    properties?: Record<string, string | number | boolean>;
  }): void {
    if (typeof window === "undefined" || !this.config) return;
    this.enqueue({
      eventType: "tx_funnel",
      eventName: `tx_${params.stage}`,
      path: window.location.pathname || "/",
      txStage: params.stage,
      network: params.network || "mainnet",
      contractId: params.contractId,
      properties: params.properties,
    });
  }

  flush(useBeacon = false): void {
    if (!this.config || this.queue.length === 0) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    if (useBeacon) {
      // On tab hide/unload, drain the whole queue in MAX_BATCH chunks so a
      // backlog larger than one batch is not silently dropped.
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, MAX_BATCH);
        if (!this.sendWithBeacon(batch)) {
          this.sendWithFetch(batch);
        }
      }
      return;
    }

    this.sendWithFetch(this.queue.splice(0, MAX_BATCH));
    if (this.queue.length > 0) {
      this.scheduleFlush();
    }
  }

  private sendWithBeacon(batch: WebEventPayload[]): boolean {
    if (typeof navigator.sendBeacon !== "function") return false;
    const url = `${this.config!.endpoint}/v1/ingest/web`;
    const body = JSON.stringify({
      publicKey: this.config!.publicKey,
      events: batch,
    });
    const blob = new Blob([body], { type: "application/json" });
    return navigator.sendBeacon(url, blob);
  }

  private sendWithFetch(batch: WebEventPayload[]): void {
    if (batch.length === 0) return;
    const url = `${this.config!.endpoint}/v1/ingest/web`;
    const body = JSON.stringify({
      publicKey: this.config!.publicKey,
      events: batch,
    });
    void fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-krest-key": this.config!.publicKey,
      },
      body,
      keepalive: true,
      mode: "cors",
    }).catch(() => {
      // Never throw telemetry errors into host application
    });
  }

  private scheduleFlush(): void {
    if (this.timer) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.flush(false);
    }, this.config?.flushIntervalMs ?? 1500);
  }

  private enqueue(event: WebEventPayload): void {
    this.queue.push(event);
    if (this.queue.length >= MAX_BATCH) {
      this.flush(false);
      return;
    }
    this.scheduleFlush();
  }

  private hookSpaNavigation(): void {
    if (this.spaHooked || typeof window === "undefined") return;
    this.spaHooked = true;

    const originalPushState = history.pushState.bind(history);
    history.pushState = (...args: Parameters<History["pushState"]>) => {
      originalPushState(...args);
      this.trackPageview();
    };

    window.addEventListener("popstate", () => {
      this.trackPageview();
    });
  }
}

export const krest = new KrestClient();
export default krest;
