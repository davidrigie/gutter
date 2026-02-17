import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./scripts/screenshots",
  testMatch: "*.spec.ts",
  timeout: 60_000,
  fullyParallel: true,
  workers: "100%",
  use: {
    viewport: { width: 1475, height: 977 },
    deviceScaleFactor: 2,
    screenshot: "off",
  },
  projects: [
    {
      name: "screenshots",
      use: { browserName: "chromium" },
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:1421",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
