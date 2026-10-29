// Test database helpers. AI-run tests (vitest integration, Playwright) use `self_test`, never the dev
// database `self` that `npm run dev` and pgAdmin use. Shared by scripts/test-db.ts, vitest and Playwright.
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";

// Lowercase letters, digits and underscores only: the name is placed inside CREATE/DROP DATABASE,
// which cannot take parameters.
const TEST_DB_NAME = /^[a-z0-9_]*_test$/;

/** Loads `.env` into process.env without overriding values that are already set. */
export function loadDotEnv() {
  try {
    process.loadEnvFile();
  } catch {
    // no .env file: rely on the real environment
  }
}

export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
}

/**
 * The safety guard. Throws unless the URL points at a database whose name ends in `_test`, so a test
 * `truncate` can never reach the dev database. Returns the URL when it is safe.
 */
export function assertTestDbUrl(url: string | undefined): string {
  if (!url) {
    throw new Error("TEST_DATABASE_URL is not set. Add it to .env (see .env.example), e.g. .../self_test");
  }
  const name = databaseName(url);
  if (!TEST_DB_NAME.test(name)) {
    throw new Error(
      `Refusing to use database "${name}" for tests: its name must end in "_test" (lowercase letters, digits, underscores).`,
    );
  }
  return url;
}

/** Creates the test database if missing (or drops and recreates it with `reset`), then applies migrations. */
export async function ensureTestDb(options: { reset?: boolean } = {}): Promise<string> {
  const url = assertTestDbUrl(process.env.TEST_DATABASE_URL);
  const name = databaseName(url);

  // Postgres cannot create a database while connected to it: use the built-in `postgres` database.
  const adminUrl = new URL(url);
  adminUrl.pathname = "/postgres";
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    if (options.reset) await admin.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
    const exists = await admin.query("select 1 from pg_database where datname = $1", [name]);
    if (exists.rowCount === 0) {
      await admin.query(`CREATE DATABASE "${name}"`);
      console.log(`test db: created ${name}`);
    }
  } finally {
    await admin.end();
  }

  const pool = new Pool({ connectionString: url });
  try {
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
  } finally {
    await pool.end();
  }
  return url;
}
