// Integration test: the daily guest clean-up (D80). Real Postgres. Run with: npm run test:int
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { chatAttempts } from "@/modules/chat/schema";
import { cleanUpGuests } from "./guest-cleanup";

let counter = 0;
const stamp = Date.now();
const eightDaysAgo = () => new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);

async function makeUser(guest: boolean, createdAt = new Date()) {
  const id = `cleanup-test-${stamp}-${counter++}`;
  await db.execute(
    sql`insert into auth_user (id, name, email, "isAnonymous", "createdAt") values (${id}, '', ${id + "@phone.invalid"}, ${guest}, ${createdAt})`,
  );
  return id;
}
const attemptFor = async (userId: string) => {
  const [row] = await db.insert(chatAttempts).values({ userId, setVersion: "1.0.0", status: "completed" }).returning();
  return row!.id;
};
const exists = async (id: string) =>
  ((await db.execute(sql`select 1 from auth_user where id = ${id}`)).rows as unknown[]).length === 1;
const attemptOwner = async (id: string) =>
  (await db.select().from(chatAttempts).where(eq(chatAttempts.id, id)))[0]?.userId;

const wipe = () => db.execute(sql`delete from auth_user where id like 'cleanup-test-%'`);
beforeEach(wipe);
afterAll(wipe);

describe("cleanUpGuests", () => {
  it("hands a linked guest's quiz to the learner BEFORE deleting the guest", async () => {
    const learner = await makeUser(false);
    const guest = await makeUser(true, eightDaysAgo());
    await db.execute(sql`update auth_user set "linkedUserId" = ${learner} where id = ${guest}`);
    const attempt = await attemptFor(guest);

    expect(await cleanUpGuests()).toBe(1);
    expect(await exists(guest)).toBe(false);
    expect(await attemptOwner(attempt)).toBe(learner); // survived: re-pointed, not cascade-deleted
  });

  it("deletes an old guest who never verified, with the unfinished quiz", async () => {
    const guest = await makeUser(true, eightDaysAgo());
    const attempt = await attemptFor(guest);
    await cleanUpGuests();
    expect(await exists(guest)).toBe(false);
    expect(await attemptOwner(attempt)).toBeUndefined();
  });

  it("keeps a recent guest, an old real learner, and a guest that has a lead", async () => {
    const fresh = await makeUser(true);
    const oldLearner = await makeUser(false, eightDaysAgo());
    const withLead = await makeUser(true, eightDaysAgo());
    await db.execute(
      sql`insert into leads (user_id, attempt_id, phone, contact_role, consent_at, consent_version)
          values (${withLead}, gen_random_uuid(), '+919999999999', 'learner', now(), 'test')`,
    );
    await cleanUpGuests();
    expect(await exists(fresh)).toBe(true);
    expect(await exists(oldLearner)).toBe(true);
    expect(await exists(withLead)).toBe(true);
  });

  it("is safe to run twice", async () => {
    await makeUser(true, eightDaysAgo());
    expect(await cleanUpGuests()).toBe(1);
    expect(await cleanUpGuests()).toBe(0);
  });
});
