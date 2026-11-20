// Playwright global setup (local and CI): the test database exists and is migrated, old rate-limit counters and the
// admin numbers' unfinished quizzes are gone, and every main page has been opened once. Playwright starts the web server before this runs.
import type { FullConfig } from "@playwright/test";
import globalSetup from "./global-setup";
import { resetBetweenRuns } from "./e2e";

/** The dev server compiles a page on its first visit, which can take longer than a test waits for one step. */
const WARM_UP = [
  "/",
  "/login",
  "/admin/login",
  "/discover",
  "/discover/report",
  "/learn",
  "/learn/ux-design-essentials",
];

async function warmUp(baseURL: string) {
  for (const path of WARM_UP) {
    try {
      await fetch(new URL(path, baseURL), { redirect: "manual", signal: AbortSignal.timeout(180_000) });
    } catch {
      // a slow or failing page is reported by the test that uses it, not here
    }
  }
}

export default async function e2eGlobalSetup(config: FullConfig) {
  await globalSetup();
  await resetBetweenRuns();
  const baseURL = config.projects[0]?.use.baseURL;
  if (baseURL) await warmUp(baseURL);
}
