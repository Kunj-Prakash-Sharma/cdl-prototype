// Playwright global setup (local runs): test database exists and is migrated, and old rate-limit counters are gone.
import globalSetup from "./global-setup";
import { resetAuthLimits } from "./e2e";

export default async function e2eGlobalSetup() {
  await globalSetup();
  await resetAuthLimits();
}
