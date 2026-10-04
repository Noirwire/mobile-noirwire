import { defineConfig, devices } from "@playwright/test";

// The UI suite runs against the static web export, served on its own port.
// The export is built against https://api.noirwire.com, and every request to
// that origin is answered by committed fixtures (e2e/support/api.ts): no
// test reaches the real API, Solana or any other host.
const PORT = Number(process.env.E2E_PORT ?? 8061);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const EXPORT_DIR = "dist/e2e";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3,
  forbidOnly: !!process.env.CI,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "web-export",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command:
      process.env.E2E_SKIP_EXPORT === "1"
        ? `node e2e/support/serve.mjs ${EXPORT_DIR} ${PORT}`
        : `npx expo export --platform web --clear --output-dir ${EXPORT_DIR} && node e2e/support/serve.mjs ${EXPORT_DIR} ${PORT}`,
    env: {
      EXPO_PUBLIC_API_URL: "https://api.noirwire.com",
      EXPO_PUBLIC_SOLANA_NETWORK: "mainnet",
    },
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 300_000,
    stdout: "ignore",
    stderr: "pipe",
  },
});
