// Integration test: the real pg-boss adapter against the `self_test` database (tests/support refuses any other).
// Run with: npm run test:int
import { sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { PgBossQueue } from "./pgboss";

const JOB = "test.schedule_probe";
const queue = new PgBossQueue(process.env.DATABASE_URL!);

afterAll(async () => {
  await db.execute(sql`delete from pgboss.schedule where name = ${JOB}`);
  await queue.stop();
});

describe("PgBossQueue.schedule", () => {
  it("stores one schedule with the cron, even when the worker calls it on every start", async () => {
    await queue.schedule(JOB, "*/5 * * * *");
    await queue.schedule(JOB, "*/5 * * * *");
    const { rows } = await db.execute<{ name: string; cron: string }>(
      sql`select name, cron from pgboss.schedule where name = ${JOB}`,
    );
    expect(rows).toEqual([{ name: JOB, cron: "*/5 * * * *" }]);
  });

  it("changes the cron when the schedule changes", async () => {
    await queue.schedule(JOB, "*/10 * * * *");
    const { rows } = await db.execute<{ cron: string }>(sql`select cron from pgboss.schedule where name = ${JOB}`);
    expect(rows).toEqual([{ cron: "*/10 * * * *" }]);
  });
});
