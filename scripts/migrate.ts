// Applies drizzle migrations. Used instead of drizzle-kit so it also works inside the production image.
import { existsSync } from "node:fs";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { parseEnv } from "@/lib/env-schema";

async function main() {
  const env = parseEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  try {
    await pool.query("select 1");
    console.log("db: connected");
    if (!existsSync("drizzle/meta/_journal.json")) {
      console.log("db: no migrations yet (add a module schema, then run `npm run db:generate`)");
      return;
    }
    await migrate(drizzle(pool), { migrationsFolder: "drizzle" });
    console.log("db: migrations applied");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("db: migrate failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
