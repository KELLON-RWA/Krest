import assert from "node:assert/strict";
import { test } from "node:test";
import { parseUserAgent } from "../apps/api/src/lib/ua.js";

test("parses a desktop Chrome browser", () => {
  const ua =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
  const parsed = parseUserAgent(ua);
  assert.equal(parsed.isBot, false);
  assert.equal(parsed.browser, "Chrome");
  assert.equal(parsed.os, "Windows");
  assert.equal(parsed.deviceType, "desktop");
});

test("parses a mobile Safari browser", () => {
  const ua =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
  const parsed = parseUserAgent(ua);
  assert.equal(parsed.browser, "Safari");
  assert.equal(parsed.os, "iOS");
  assert.equal(parsed.deviceType, "mobile");
});

test("flags crawlers and CLI clients as bots", () => {
  assert.equal(parseUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)").isBot, true);
  assert.equal(parseUserAgent("curl/8.4.0").isBot, true);
  assert.equal(parseUserAgent("python-requests/2.31.0").isBot, true);
});

test("handles an empty user agent", () => {
  const parsed = parseUserAgent("");
  assert.equal(parsed.isBot, false);
  assert.equal(parsed.browser, "Unknown");
  assert.equal(parsed.os, "Unknown");
});
