// Integration test of the server actions: real chat service + real Postgres, with only the login faked.
// `requireUser` reads the current name from the database each time (like the real session, which has no cookie cache),
// and `updateProfileName` is a one-line stand-in (auth's own tests cover the real one).
// Run with: npm run test:int
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { chatAttempts } from "./schema";
import { ANSWER_LIMIT_PER_MINUTE } from "./limits";

const { login } = vi.hoisted(() => ({ login: { userId: null as string | null } }));

vi.mock("@/modules/auth/service", async () => {
  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");
  return {
    requireUser: async () => {
      if (!login.userId) throw Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;replace;/login" });
      const rows = await db.execute<{ name: string }>(sql`select name from auth_user where id = ${login.userId}`);
      return { userId: login.userId, role: "learner", name: rows.rows[0]!.name, phoneMasked: "" };
    },
    updateProfileName: async (userId: string, name: string) => {
      await db.execute(sql`update auth_user set name = ${name} where id = ${userId}`);
      return { ok: true };
    },
  };
});

const actions = await import("./actions");

let counter = 0;
async function loginAs(name = "") {
  const userId = `chat-test-act-${Date.now()}-${counter++}`;
  await db.execute(
    sql`insert into auth_user (id, name, email) values (${userId}, ${name}, ${userId + "@phone.invalid"})`,
  );
  login.userId = userId;
  return userId;
}

const cleanup = () => db.execute(sql`delete from auth_user where id like 'chat-test-act-%'`);
beforeEach(async () => {
  login.userId = null;
  await cleanup();
});
afterAll(cleanup);

const started = async () => {
  const res = await actions.startAttempt();
  if (!res.ok) throw new Error(res.code);
  return res;
};

describe("a logged-out visitor", () => {
  it("is sent to login by every action (a redirect, never a quiz result)", async () => {
    const id = "00000000-0000-4000-8000-000000000000";
    const calls = [
      () => actions.startAttempt(),
      () => actions.retake(),
      () => actions.submitAnswer({ attemptId: id, questionId: "b-age", value: 0 }),
      () => actions.submitName({ attemptId: id, name: "Asha" }),
      () => actions.finishAttempt({ attemptId: id }),
      () => actions.retryStage({ attemptId: id, stage: "riasec" }),
    ];
    for (const call of calls) await expect(call()).rejects.toMatchObject({ digest: expect.stringContaining("/login") });
    expect(await db.select().from(chatAttempts)).toEqual(
      (await db.select().from(chatAttempts)).filter((a) => !a.userId.startsWith("chat-test-act-")),
    );
  });
});

describe("input is checked before anything happens", () => {
  it("answers invalid_input to malformed requests, and saves nothing", async () => {
    const userId = await loginAs("Asha");
    const { attemptId } = await started();
    const garbage: unknown[] = [
      undefined,
      null,
      "x",
      42,
      {},
      { attemptId: "not-a-uuid", questionId: "b-age", value: 0 },
      { attemptId, questionId: "", value: 0 },
      { attemptId, questionId: "x".repeat(65), value: 0 },
      { attemptId, questionId: "b-age", value: "0" },
      { attemptId, questionId: "b-age" },
      { attemptId, questionId: 7, value: 0 },
    ];
    for (const input of garbage) {
      expect(await actions.submitAnswer(input), JSON.stringify(input)).toEqual({ ok: false, code: "invalid_input" });
    }
    expect(await actions.submitName({ attemptId, name: 5 })).toEqual({ ok: false, code: "invalid_input" });
    expect(await actions.submitName({ attemptId, name: "x".repeat(201) })).toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(await actions.finishAttempt({})).toEqual({ ok: false, code: "invalid_input" });
    expect(await actions.retryStage({ attemptId })).toEqual({ ok: false, code: "invalid_input" });
    const rows = await db.execute<{ n: number }>(
      sql`select count(*)::int as n from chat_answers a join chat_attempts t on t.id = a.attempt_id where t.user_id = ${userId}`,
    );
    expect(rows.rows[0]!.n).toBe(0);
  });

  it("never trusts a user id sent by the client: the attempt must belong to the logged-in learner", async () => {
    const ownerId = await loginAs("Asha");
    const { attemptId } = await started();
    await loginAs("Ravi"); // a different learner
    const smuggled = { attemptId, questionId: "b-age", value: 0, userId: ownerId };
    expect(await actions.submitAnswer(smuggled)).toEqual({ ok: false, code: "not_found" });
    expect(await actions.finishAttempt({ attemptId, userId: ownerId })).toEqual({ ok: false, code: "not_found" });
  });
});

describe("the quiz through the actions", () => {
  it("asks for the name first, saves it on the profile, then takes the learner to the questions", async () => {
    const userId = await loginAs("");
    const first = await started();
    expect(first.next.kind).toBe("name");
    const res = await actions.submitName({ attemptId: first.attemptId, name: "Asha" });
    if (!res.ok) throw new Error(res.code);
    expect(res.next.kind).toBe("basics");
    const rows = await db.execute<{ name: string }>(sql`select name from auth_user where id = ${userId}`);
    expect(rows.rows[0]!.name).toBe("Asha");
    // A refresh now starts at the basics: the profile name is read fresh, not remembered.
    const resumed = await started();
    expect(resumed.resumed).toBe(true);
    expect(resumed.next.kind).toBe("basics");
  });

  it("ends the attempt on a blocked name and saves nothing", async () => {
    const userId = await loginAs("");
    const { attemptId } = await started();
    expect(await actions.submitName({ attemptId, name: "kill myself" })).toEqual({ ok: false, code: "name_blocked" });
    const [attempt] = await db.select().from(chatAttempts).where(eq(chatAttempts.id, attemptId));
    expect(attempt!.status).toBe("abandoned");
    const rows = await db.execute<{ name: string }>(sql`select name from auth_user where id = ${userId}`);
    expect(rows.rows[0]!.name).toBe("");
  });

  it("goes from the first question to a stored result", async () => {
    await loginAs("Asha");
    const { attemptId, next } = await started();
    let step = next;
    for (let guard = 0; guard < 100 && step.kind !== "done"; guard++) {
      if (step.kind === "name") throw new Error("unexpected name step");
      const value = step.kind === "basics" ? 0 : (guard % 5) + 1;
      const res = await actions.submitAnswer({ attemptId, questionId: step.id, value });
      if (!res.ok) throw new Error(res.code);
      step = res.next;
    }
    expect(step.kind).toBe("done");
    const done = await actions.finishAttempt({ attemptId });
    if (!done.ok) throw new Error(done.code);
    expect(done.result.attemptId).toBe(attemptId);
    // Finishing twice (a double tap) returns the same result.
    expect(await actions.finishAttempt({ attemptId })).toEqual(done);
  });
});

describe("rate limit", () => {
  it("allows a normal pace and refuses a flood with a wait time, per learner", async () => {
    await loginAs("Asha");
    const { attemptId } = await started();
    const tap = () => actions.submitAnswer({ attemptId, questionId: "b-age", value: 0 });
    for (let i = 0; i < ANSWER_LIMIT_PER_MINUTE; i++) expect((await tap()).ok, `tap ${i}`).toBe(true);
    const refused = await tap();
    expect(refused).toMatchObject({ ok: false, code: "rate_limited" });
    expect("retryAfterSec" in refused ? refused.retryAfterSec : 0).toBeGreaterThan(0);

    // Another learner is not affected by this one's flood.
    await loginAs("Ravi");
    const other = await started();
    expect((await actions.submitAnswer({ attemptId: other.attemptId, questionId: "b-age", value: 0 })).ok).toBe(true);
  });

  it("also covers the name", async () => {
    await loginAs("");
    const { attemptId } = await started();
    for (let i = 0; i < ANSWER_LIMIT_PER_MINUTE; i++) await actions.submitName({ attemptId, name: "1" });
    expect(await actions.submitName({ attemptId, name: "Asha" })).toMatchObject({ ok: false, code: "rate_limited" });
  });
});
