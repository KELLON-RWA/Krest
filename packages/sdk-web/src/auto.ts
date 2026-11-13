import { krest } from "./index";

if (typeof document !== "undefined") {
  const script =
    (document.currentScript as HTMLScriptElement | null) ||
    document.querySelector<HTMLScriptElement>("script[data-krest-key]");

  if (script) {
    const publicKey = script.getAttribute("data-krest-key");
    const explicitEndpoint = script.getAttribute("data-krest-endpoint");
    const respectDnt = script.getAttribute("data-krest-dnt") === "true";

    let endpoint = explicitEndpoint || "";
    if (!endpoint && script.src) {
      try {
        endpoint = new URL(script.src).origin;
      } catch {
        endpoint = "";
      }
    }

    if (publicKey && endpoint) {
      krest.init({
        publicKey,
        endpoint,
        respectDnt,
      });
      (window as unknown as { krest?: typeof krest }).krest = krest;
    }
  }
}

export { krest };
