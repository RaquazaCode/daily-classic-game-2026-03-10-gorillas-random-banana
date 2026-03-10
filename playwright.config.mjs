import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["capture.spec.mjs"],
  timeout: 60_000,
  use: {
    baseURL: "http://127.0.0.1:4173",
    headless: true
  },
  webServer: {
    command: "pnpm dev",
    port: 4173,
    reuseExistingServer: true,
    timeout: 60_000
  }
});
