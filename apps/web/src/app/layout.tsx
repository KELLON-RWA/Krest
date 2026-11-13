import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Krest — Privacy-First Web & API Analytics for Stellar",
  description:
    "Cookie-less, zero-PII web analytics, Stellar wallet/tx funnel telemetry, and API latency monitoring.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 text-zinc-50 antialiased">{children}</body>
    </html>
  );
}
