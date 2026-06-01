import { defineConfig, devices } from "@playwright/test";

// End-to-end smoke of the built games over a real browser (desktop + mobile),
// served from dist/. Complements the Vitest unit tests on the logic cores.
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: "http://127.0.0.1:4173", trace: "on-first-retry" },
  webServer: {
    command: "npm run build && python3 -m http.server 4173 --directory dist",
    url: "http://127.0.0.1:4173/index.html",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 5"] } },
  ],
});
