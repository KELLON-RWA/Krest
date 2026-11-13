export interface ParsedUserAgent {
  isBot: boolean;
  browser: string;
  os: string;
  deviceType: "desktop" | "mobile" | "tablet";
}

const BOT_PATTERN =
  /bot|crawl|spider|slurp|mediapartners|headless|lighthouse|pingdom|uptimerobot|curl|wget|python-requests/i;

export function parseUserAgent(ua: string): ParsedUserAgent {
  if (!ua) {
    return { isBot: false, browser: "Unknown", os: "Unknown", deviceType: "desktop" };
  }

  const isBot = BOT_PATTERN.test(ua);

  let browser = "Other";
  if (/Edg\//i.test(ua)) browser = "Edge";
  else if (/OPR\/|Opera/i.test(ua)) browser = "Opera";
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome";
  else if (/Firefox\//i.test(ua)) browser = "Firefox";
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";

  let os = "Other";
  if (/Windows/i.test(ua)) os = "Windows";
  else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
  else if (/Android/i.test(ua)) os = "Android";
  else if (/Mac OS X|Macintosh/i.test(ua)) os = "macOS";
  else if (/Linux/i.test(ua)) os = "Linux";

  let deviceType: "desktop" | "mobile" | "tablet" = "desktop";
  if (/iPad|Tablet/i.test(ua)) {
    deviceType = "tablet";
  } else if (/Mobile|Android|iPhone|iPod/i.test(ua)) {
    deviceType = "mobile";
  }

  return { isBot, browser, os, deviceType };
}
