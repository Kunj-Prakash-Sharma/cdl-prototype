// Creates (if missing) and migrates the test database `self_test`. `--reset` drops it first.
// Run via `npm run db:test:setup` or `npm run db:test:reset`. Only ever touches a database named `*_test`.
import { ensureTestDb } from "../tests/support/test-db";

ensureTestDb({ reset: process.argv.includes("--reset") })
  .then(() => console.log("test db: ready"))
  .catch((err) => {
    console.error("test db: failed:", err instanceof Error ? err.message : err);
    process.exit(1);
  });
