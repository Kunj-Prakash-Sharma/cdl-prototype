// Integration test: guests and the phone gate (D78, D80). Real chat service + real Postgres. A guest is a plain
// `auth_user` row with isAnonymous = true; "verifying a phone" is simulated by setting linkedUserId, which is exactly
// what auth's link hook records (that hook is tested in modules/auth/guest.int.test.ts).
// Run with: npm run test:int
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/db";
import { CURRENT_QUESTION_SET } from "./question-set";
import { chatAnswers, chatAttempts } from "./schema";
import { SAMPLE_REPORT } from "./sample-report";
import {
  claimLinkedGuests,
  finishAttempt,
  getLatestReport,
  getNextStep,
  getReportForVisitor,
  startOrResumeAttempt,
  submitAnswer,
  type Learner,
  type NextStep,
} from "./service";

const set = CURRENT_QUESTION_SET;
let counter = 0;
const stamp = Date.now();

async function makeUser(opts: { guest: boolean; name?: string }): Promise<Learner> {
  const userId = `chat-guest-test-${stamp}-${counter++}`;
  const name = opts.name ?? "Asha";
  await db.execute(
    sql`insert into auth_user (id, name, email, "isAnonymous") values (${userId}, ${name}, ${userId + "@phone.invalid"}, ${opts.guest})`,
  );
  return { userId, name };
}
const link = (guest: Learner, user: Learner) =>
  db.execute(sql`update auth_user set "linkedUserId" = ${user.userId} where id = ${guest.userId}`);

const start = async (learner: Learner) => {
  const res = await startOrResumeAttempt(learner);
  if (!res.ok) throw new Error(`start failed: ${res.code}`);
  return res.attemptId;
};

async function answerAll(learner: Learner, attemptId: string, scored: (i: number) => number) {
  for (let guard = 0; guard < 100; guard++) {
    const res = await getNextStep(learner, attemptId);
    if (!res.ok) throw new Error(`next failed: ${res.code}`);
    const step: NextStep = res.next;
    if (step.kind === "done") return;
    if (step.kind === "name") throw new Error("needs a name");
    const index = set.items.findIndex((i) => i.id === step.id);
    const saved = await submitAnswer(learner, attemptId, step.id, step.kind === "basics" ? 0 : scored(index));
    if (!saved.ok) throw new Error(`submit failed: ${saved.code}`);
  }
}

async function finishedQuiz(learner: Learner, scored: (i: number) => number = (i) => (i % 5) + 1) {
  const attemptId = await start(learner);
  await answerAll(learner, attemptId, scored);
  const done = await finishAttempt(learner, attemptId);
  if (!done.ok) throw new Error(`finish failed: ${done.code}`);
  return attemptId;
}

const attemptRow = async (id: string) => (await db.select().from(chatAttempts).where(eq(chatAttempts.id, id)))[0]!;
const cleanup = () => db.execute(sql`delete from auth_user where id like 'chat-guest-test-%'`);
beforeEach(cleanup);
afterAll(cleanup);

describe("a guest takes the quiz", () => {
  it("can start, answer and finish, with the guest's own id", async () => {
    const guest = await makeUser({ guest: true });
    const attemptId = await finishedQuiz(guest);
    expect((await attemptRow(attemptId)).status).toBe("completed");
  });
});

describe("the phone gate sends a guest no real data", () => {
  it("gives a guest who finished only the fixed sample", async () => {
    const guest = await makeUser({ guest: true });
    const attemptId = await finishedQuiz(guest, (i) => ((i * 3) % 5) + 1); // varied (all-same answers are refused), not like the sample
    const res = await getReportForVisitor({ userId: guest.userId, isGuest: true });
    expect(res.ok && res.gated).toBe(true);
    if (!res.ok || !res.gated) return;
    expect(res.finished).toBe(true);
    // Same sample for everyone: identical to the constant, apart from the (also fixed) course suggestions.
    expect({ ...res.sample, courses: undefined, coursesAreFallback: undefined }).toEqual({
      ...SAMPLE_REPORT,
      courses: undefined,
      coursesAreFallback: undefined,
    });
    // Nothing of the guest's real result is anywhere in what the page receives.
    const wire = JSON.stringify(res);
    expect(wire).not.toContain(attemptId);
    expect(wire).not.toContain(guest.userId);
    expect(wire).not.toContain(guest.name);
    const real = await getLatestReport(guest.userId);
    expect(real.ok && real.latest?.report.interests.map((i) => i.score)).not.toEqual(
      SAMPLE_REPORT.interests.map((i) => i.score),
    );
  });

  it("says 'not finished' for a guest with no completed quiz, and still sends no real data", async () => {
    const guest = await makeUser({ guest: true });
    await start(guest);
    const res = await getReportForVisitor({ userId: guest.userId, isGuest: true });
    expect(res.ok && res.gated && !res.finished).toBe(true);
  });

  it("gives a verified learner the real report", async () => {
    const learner = await makeUser({ guest: false });
    const attemptId = await finishedQuiz(learner);
    const res = await getReportForVisitor({ userId: learner.userId, isGuest: false });
    expect(res.ok && !res.gated && res.latest?.attemptId).toBe(attemptId);
  });
});

describe("claiming a guest's quiz after the phone is verified", () => {
  it("moves the same rows to the learner, so the report opens", async () => {
    const guest = await makeUser({ guest: true });
    const learner = await makeUser({ guest: false, name: "" });
    const attemptId = await finishedQuiz(guest);
    const answers = (await db.select().from(chatAnswers).where(eq(chatAnswers.attemptId, attemptId))).length;
    await link(guest, learner);

    const res = await getLatestReport(learner.userId); // claims at the top
    expect(res.ok && res.latest?.attemptId).toBe(attemptId);
    expect((await attemptRow(attemptId)).userId).toBe(learner.userId);
    expect((await db.select().from(chatAnswers).where(eq(chatAnswers.attemptId, attemptId))).length).toBe(answers);
  });

  it("is safe to run twice", async () => {
    const guest = await makeUser({ guest: true });
    const learner = await makeUser({ guest: false });
    await finishedQuiz(guest);
    await link(guest, learner);
    expect(await claimLinkedGuests(learner.userId)).toBe(1);
    expect(await claimLinkedGuests(learner.userId)).toBe(0);
  });

  it("lets the newest completed quiz win over an older report", async () => {
    const learner = await makeUser({ guest: false });
    await finishedQuiz(learner, (i) => (i % 5) + 1);
    const guest = await makeUser({ guest: true });
    const newest = await finishedQuiz(guest, (i) => ((i + 2) % 5) + 1);
    await link(guest, learner);
    const res = await getLatestReport(learner.userId);
    expect(res.ok && res.latest?.attemptId).toBe(newest);
  });

  it("keeps one open attempt when both have one: the newest wins, no database error", async () => {
    const learner = await makeUser({ guest: false });
    const older = await start(learner);
    await db
      .update(chatAttempts)
      .set({ lastAnswerAt: new Date(Date.now() - 60_000) })
      .where(eq(chatAttempts.id, older));
    const guest = await makeUser({ guest: true });
    const newer = await start(guest);
    await db.update(chatAttempts).set({ lastAnswerAt: new Date() }).where(eq(chatAttempts.id, newer));
    await link(guest, learner);

    expect(await claimLinkedGuests(learner.userId)).toBe(1);
    expect((await attemptRow(older)).status).toBe("abandoned");
    const open = await attemptRow(newer);
    expect(open.status).toBe("in_progress");
    expect(open.userId).toBe(learner.userId);
  });

  it("never gives a stranger someone else's guest quiz", async () => {
    const guest = await makeUser({ guest: true });
    const stranger = await makeUser({ guest: false });
    const attemptId = await finishedQuiz(guest);
    expect(await claimLinkedGuests(stranger.userId)).toBe(0); // the guest is not linked to the stranger
    expect((await attemptRow(attemptId)).userId).toBe(guest.userId);
  });
});
