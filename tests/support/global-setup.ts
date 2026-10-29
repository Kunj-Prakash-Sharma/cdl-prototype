// Runs once before the integration tests (and the Playwright run): makes sure `self_test` exists and is migrated.
import { ensureTestDb, loadDotEnv } from "./test-db";

export default async function globalSetup() {
  loadDotEnv();
  try {
    await ensureTestDb();
  } catch (err) {
    // Vitest's own error printer can fail on errors thrown from setup files and then reports
    // "No test files found", which hides the cause. Print the reason ourselves first.
    console.error(`\n[test db] ${err instanceof Error ? err.message : err}\n`);
    throw err;
  }
}
