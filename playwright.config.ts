import { defineConfig, devices } from "@playwright/test";
import { E2E_ADMIN_PHONES } from "./tests/support/e2e";
import { assertTestDbUrl, loadDotEnv } from "./tests/support/test-db";

loadDotEnv();

const ci = !!process.env.CI;

// The browser tests run their own server on port 3100 against the test database `self_test`, so they never touch
// your dev data and can run next to `npm run dev` (port 3000). CI does the same with a Postgres service
// (.github/workflows/ci.yml). It is a dev server, not `next start`: production refuses the fake SMS adapter, and
// almost every test logs in with a code from it.
const port = 3100;
const testDbUrl = assertTestDbUrl(process.env.TEST_DATABASE_URL);

export default defineConfig({
  testDir: "./tests/e2e",
  // Prepares the test database, then opens each page once so tests do not wait for a first compile.
  globalSetup: "./tests/support/e2e-global-setup.ts",
  fullyParallel: true,
  // One dev server compiles pages on demand; more than two browsers at once make it slow enough to time tests out.
  workers: 2,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
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
    reuseExistingServer: !ci,
    timeout: 180_000,
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
