import { defineConfig, devices } from "@playwright/test";
import { E2E_ADMIN_PHONES } from "./tests/support/e2e";
import { assertTestDbUrl, loadDotEnv } from "./tests/support/test-db";

loadDotEnv();

// The browser tests run their own dev server on port 3100 against the test database `self_test`, so they never
// touch your dev data and can run next to `npm run dev` (port 3000). CI does the same: its Postgres service
// provides `self_test` (TEST_DATABASE_URL comes from .env.example). A dev server is used because the production
// server refuses the fake SMS adapter that the login tests need.
const port = 3100;
const testDbUrl = assertTestDbUrl(process.env.TEST_DATABASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/support/e2e-global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL: `http://localhost:${port}`, trace: "on-first-retry" },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true },
    },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npx next dev -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    // Own build folder: Next 16 allows one dev server per folder, so this can run next to `npm run dev`.
    // The e2e admin numbers become admins at login; they exist only on this test server.
    env: {
      DATABASE_URL: testDbUrl,
      APP_URL: `http://localhost:${port}`,
      NEXT_DIST_DIR: ".next-test",
      ADMIN_PHONES: E2E_ADMIN_PHONES.join(","),
    },
  },
});
