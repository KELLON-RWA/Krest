import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    clean: true,
    sourcemap: false,
    minify: true,
    target: "es2020",
  },
  {
    entry: { krest: "src/auto.ts" },
    format: ["iife"],
    globalName: "KrestAnalytics",
    clean: false,
    sourcemap: false,
    minify: true,
    target: "es2020",
  },
]);
