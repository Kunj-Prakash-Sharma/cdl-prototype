// Vitest setup file for integration tests (INT=1 only). Runs in every test worker BEFORE the test file imports
// `@/lib/env`, so the app connects to the test database. DATABASE_URL is overwritten on purpose: even if the
// shell has the dev URL set, integration tests never touch it.
import { assertTestDbUrl, loadDotEnv } from "./test-db";

loadDotEnv();
process.env.DATABASE_URL = assertTestDbUrl(process.env.TEST_DATABASE_URL);
