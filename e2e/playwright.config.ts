import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "ja-JP",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Requires: docker compose up -d (postgres) — API and web are started by Playwright.
  webServer: [
    {
      command: "pnpm --filter @slotlock/api dev",
      url: "http://localhost:3000/health",
      cwd: "..",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      command: "pnpm --filter @slotlock/web dev",
      url: "http://localhost:5173",
      cwd: "..",
      reuseExistingServer: true,
      timeout: 60_000,
    },
  ],
});
