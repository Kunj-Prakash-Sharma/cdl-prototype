// `npm run dev:test`: the app on port 3100 against the test database, so an AI-found bug can be reproduced by hand
// without touching your own data in `self`. Your normal `npm run dev` (port 3000) can run at the same time.
import { spawn } from "node:child_process";
import { E2E_ADMIN_PHONES } from "../tests/support/e2e";
import { assertTestDbUrl, ensureTestDb } from "../tests/support/test-db";

const PORT = "3100";

async function main() {
  const url = assertTestDbUrl(process.env.TEST_DATABASE_URL);
  await ensureTestDb();
  const child = spawn("npx", ["next", "dev", "-p", PORT], {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: url,
      APP_URL: `http://localhost:${PORT}`,
      NEXT_DIST_DIR: ".next-test",
      // Same admin numbers as the browser tests, so the admin area can be tried by hand on this server.
      ADMIN_PHONES: E2E_ADMIN_PHONES.join(","),
    },
  });
  child.on("exit", (code) => process.exit(code ?? 0));
}

main().catch((err) => {
  console.error("dev:test failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
