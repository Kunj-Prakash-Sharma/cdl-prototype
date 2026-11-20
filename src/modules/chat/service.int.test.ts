// Integration test: real chat service + real Postgres (the `self_test` database; see tests/support).
// No Better Auth and no Next here: the service takes the learner as a plain object, so only the database is real.
// Run with: npm run test:int
import { eq, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { analytics } from "@/integrations/analytics";
import { db } from "@/lib/db";
import { questionOrder } from "./flow";
import { CURRENT_QUESTION_SET } from "./question-set";
import { CURRENT_REPORT_COPY, REPORT_COPIES, type ReportCopy } from "./report-copy";
import { chatAnswers, chatAttempts, chatResults } from "./schema";
import {
  abandonAttempt,
  applyHomeAnswer,
  finishAttempt,
  getCallbackContext,
  getCallbackContextForAdmin,
  getLatestReport,
  getLatestResult,
  getNextStep,
  getResumeOffer,
  hasOpenAttempt,
  recordReportAction,
  trackReportViewed,
  restartAttempt,
  retake,
  retryStage,
  startOrResumeAttempt,
  submitAnswer,
  submitName,
  type Learner,
  type NextStep,
} from "./service";
import { variantFor } from "./variants";

const set = CURRENT_QUESTION_SET;
const order = questionOrder(set);
const firstScored = set.items[0]!;
const lastScored = set.items[set.items.length - 1]!;

let counter = 0;
/** A fresh learner row (the attempt table has a foreign key to the login table), created with raw SQL on purpose. */
async function makeLearner(name = "Asha"): Promise<Learner> {
  const userId = `chat-test-${Date.now()}-${counter++}`;
  await db.execute(
    sql`insert into auth_user (id, name, email) values (${userId}, ${name}, ${userId + "@phone.invalid"})`,
  );
  return { userId, name };
}

const start = async (learner: Learner) => {
  const res = await startOrResumeAttempt(learner);
  if (!res.ok) throw new Error(`start failed: ${res.code}`);
  return res;
};

/** Answers every remaining question. `scored(index)` picks the value for the index-th scored question. */
async function answerAll(learner: Learner, attemptId: string, scored: (index: number) => number = (i) => (i % 5) + 1) {
  for (let guard = 0; guard < 100; guard++) {
    const res = await getNextStep(learner, attemptId);
    if (!res.ok) throw new Error(`next failed: ${res.code}`);
    const step: NextStep = res.next;
    if (step.kind === "done") return;
    if (step.kind === "name") throw new Error("test learner needs a name");
    const index = set.items.findIndex((i) => i.id === step.id);
    const value = step.kind === "basics" ? 0 : scored(index);
    const saved = await submitAnswer(learner, attemptId, step.id, value);
    if (!saved.ok) throw new Error(`submit failed: ${saved.code}`);
  }
  throw new Error("never finished");
}

const answerRows = (attemptId: string) => db.select().from(chatAnswers).where(eq(chatAnswers.attemptId, attemptId));
const attemptRow = async (attemptId: string) =>
  (await db.select().from(chatAttempts).where(eq(chatAttempts.id, attemptId)))[0]!;

// Only our own rows are removed (the auth tests share this database). Deleting the user cascades to chat tables.
const cleanup = () => db.execute(sql`delete from auth_user where id like 'chat-test-%'`);
beforeEach(cleanup);
afterAll(cleanup);

describe("starting and resuming", () => {
  it("creates an attempt pinned to the current question set, starting at the status question (the name comes second)", async () => {
    const learner = await makeLearner("");
    const res = await start(learner);
    expect(res.resumed).toBe(false);
    expect(res.next).toMatchObject({ kind: "basics", id: "b-status" });
    const second = await submitAnswer(learner, res.attemptId, "b-status", 0);
    if (!second.ok) throw new Error(second.code);
    expect(second.next.kind).toBe("name");
    const row = await attemptRow(res.attemptId);
    expect(row.setVersion).toBe(set.version);
    expect(row.status).toBe("in_progress");
    expect(row.userId).toBe(learner.userId);
  });

  it("skips the name step when the profile already has a name", async () => {
    const res = await start(await makeLearner("Asha"));
    expect(res.next.kind).toBe("basics");
  });

  it("resumes the same attempt instead of creating another", async () => {
    const learner = await makeLearner();
    const first = await start(learner);
    const second = await start(learner);
    expect(second.attemptId).toBe(first.attemptId);
    expect(second.resumed).toBe(true);
    const rows = await db.select().from(chatAttempts).where(eq(chatAttempts.userId, learner.userId));
    expect(rows).toHaveLength(1);
  });

  it("creates exactly one attempt when two tabs start at the same moment", async () => {
    const learner = await makeLearner();
    const results = await Promise.all(Array.from({ length: 6 }, () => startOrResumeAttempt(learner)));
    const ids = new Set(results.map((r) => (r.ok ? r.attemptId : "failed")));
    expect(ids.size).toBe(1);
    expect(ids.has("failed")).toBe(false);
    const rows = await db.select().from(chatAttempts).where(eq(chatAttempts.userId, learner.userId));
    expect(rows).toHaveLength(1);
  });

  it("keeps attempts of different learners apart", async () => {
    const [a, b] = [await makeLearner(), await makeLearner()];
    expect((await start(a)).attemptId).not.toBe((await start(b)).attemptId);
  });
});

describe("answering", () => {
  it("saves an answer and returns the next step with Mira's reply", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    const basic = set.basics[0]!;
    const res = await submitAnswer(learner, attemptId, basic.id, 1);
    if (!res.ok) throw new Error(res.code);
    expect(res.acknowledgement).toBe(basic.options[1]!.acknowledgement);
    expect(res.next.kind).toBe("basics");
    const rows = await answerRows(attemptId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ questionId: basic.id, value: 1, variantId: null });
  });

  it("overwrites on a second tap: one row, the new value (double tap and retry are safe)", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    const basic = set.basics[0]!;
    await submitAnswer(learner, attemptId, basic.id, 0);
    await submitAnswer(learner, attemptId, basic.id, 0);
    await submitAnswer(learner, attemptId, basic.id, 2);
    const rows = await answerRows(attemptId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBe(2);
  });

  it("stores the wording the attempt was shown, picked on the server", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId);
    for (const row of await answerRows(attemptId)) {
      const item = set.items.find((i) => i.id === row.questionId);
      expect(row.variantId, row.questionId).toBe(item ? variantFor(attemptId, item).id : null);
    }
  });

  it("stores only ids and numbers: no question text, no name, no phone, no email column", async () => {
    const columns = await db.execute<{ table_name: string; column_name: string }>(
      sql`select table_name, column_name from information_schema.columns where table_name like 'chat\\_%'`,
    );
    const names = columns.rows.map((c) => c.column_name);
    expect(names.length).toBeGreaterThan(10);
    for (const name of names) expect(name, name).not.toMatch(/(^|_)(name|phone|email|text|answer_text|message)(_|$)/);
  });

  it("rejects an unknown question, the name, and values outside the scale or option list", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    const basic = set.basics[0]!;
    for (const [id, value] of [
      ["x-nope", 3],
      [set.name.id, 1],
      [basic.id, basic.options.length],
      [basic.id, -1],
      [basic.id, 1.5],
    ] as const) {
      expect(await submitAnswer(learner, attemptId, id, value), `${id} ${value}`).toEqual({
        ok: false,
        code: "invalid_input",
      });
    }
    expect(await answerRows(attemptId)).toHaveLength(0);
  });

  it("rejects a scored value of 0 or 6, once the learner has reached that question", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId, () => 3).catch(() => undefined);
    // Re-answer an earlier scored question with bad values: still rejected as invalid input.
    for (const value of [0, 6]) {
      expect(await submitAnswer(learner, attemptId, firstScored.id, value)).toEqual({
        ok: false,
        code: "invalid_input",
      });
    }
  });

  it("rejects a question that is not reached yet (nothing is saved)", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    expect(await submitAnswer(learner, attemptId, lastScored.id, 3)).toEqual({ ok: false, code: "out_of_order" });
    expect(await submitAnswer(learner, attemptId, firstScored.id, 3)).toEqual({ ok: false, code: "out_of_order" });
    expect(await answerRows(attemptId)).toHaveLength(0);
  });

  it("does not let a learner without a name answer the questions after the name", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    await submitAnswer(learner, attemptId, set.basics[0]!.id, 0); // status, asked before the name
    expect(await submitAnswer(learner, attemptId, set.basics[1]!.id, 0)).toEqual({ ok: false, code: "out_of_order" });
  });

  it("lets a learner change an earlier answer (back)", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await submitAnswer(learner, attemptId, set.basics[0]!.id, 0);
    await submitAnswer(learner, attemptId, set.basics[1]!.id, 0);
    const res = await submitAnswer(learner, attemptId, set.basics[0]!.id, 3);
    expect(res.ok).toBe(true);
    expect((await answerRows(attemptId)).find((r) => r.questionId === set.basics[0]!.id)!.value).toBe(3);
  });
});

describe("resume", () => {
  it("shows the same question and the same wording after a refresh", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    for (const entry of order.filter((e) => e.kind !== "name").slice(0, set.basics.length + 4)) {
      await submitAnswer(learner, attemptId, entry.id, entry.kind === "basics" ? 0 : 3);
    }
    const a = await getNextStep(learner, attemptId);
    const b = await getNextStep(learner, attemptId);
    const c = await startOrResumeAttempt(learner);
    expect(a).toEqual(b);
    if (!a.ok || !c.ok) throw new Error("expected ok");
    expect(c.next).toEqual(a.next);
    expect(a.next.kind).toBe("question");
    if (a.next.kind === "question") expect(a.next.id).toBe(set.items[4]!.id);
  });
});

describe("ownership: someone else's attempt looks like a missing one", () => {
  it("answers not_found to every function, and changes nothing", async () => {
    const owner = await makeLearner();
    const stranger = await makeLearner();
    const { attemptId } = await start(owner);
    const notFound = { ok: false, code: "not_found" };
    expect(await getNextStep(stranger, attemptId)).toEqual(notFound);
    expect(await submitAnswer(stranger, attemptId, set.basics[0]!.id, 0)).toEqual(notFound);
    expect(await finishAttempt(stranger, attemptId)).toEqual(notFound);
    expect(await retryStage(stranger, attemptId, "riasec")).toEqual(notFound);
    expect(await abandonAttempt(stranger, attemptId)).toEqual(notFound);
    expect(await answerRows(attemptId)).toHaveLength(0);
    expect((await attemptRow(attemptId)).status).toBe("in_progress");
  });

  it("answers not_found for a missing id and for text that is not an id", async () => {
    const learner = await makeLearner();
    for (const id of ["00000000-0000-4000-8000-000000000000", "not-a-uuid", "", "1; drop table chat_attempts"]) {
      expect(await getNextStep(learner, id), id).toEqual({ ok: false, code: "not_found" });
    }
  });
});

describe("finishing", () => {
  it("refuses to finish before every question is answered", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    expect(await finishAttempt(learner, attemptId)).toEqual({ ok: false, code: "incomplete" });
    await submitAnswer(learner, attemptId, set.basics[0]!.id, 0);
    expect(await finishAttempt(learner, attemptId)).toEqual({ ok: false, code: "incomplete" });
    expect((await attemptRow(attemptId)).status).toBe("in_progress");
    expect(await db.select().from(chatResults).where(eq(chatResults.attemptId, attemptId))).toHaveLength(0);
  });

  it("scores with fixed rules, stores the result and completes the attempt", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId);
    const res = await finishAttempt(learner, attemptId);
    if (!res.ok) throw new Error(res.code);
    expect(res.result.attemptId).toBe(attemptId);
    expect(res.result.setVersion).toBe(set.version);
    expect(Object.keys(res.result.ocean).sort()).toEqual(["A", "C", "E", "N", "O"]);
    expect(Object.keys(res.result.riasec).sort()).toEqual(["A", "C", "E", "I", "R", "S"]);

    const attempt = await attemptRow(attemptId);
    expect(attempt.status).toBe("completed");
    expect(attempt.completedAt).not.toBeNull();
    const [stored] = await db.select().from(chatResults).where(eq(chatResults.attemptId, attemptId));
    expect(stored!.setVersion).toBe(set.version);
    expect(stored!.stageStatus).toEqual({ ocean: "ok", riasec: "ok" });
    expect(await getLatestResult(learner.userId)).toEqual(res.result);
  });

  it("is safe to call twice: the second call returns the same stored result", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId);
    const first = await finishAttempt(learner, attemptId);
    const second = await finishAttempt(learner, attemptId);
    expect(second).toEqual(first);
    expect(await db.select().from(chatResults).where(eq(chatResults.attemptId, attemptId))).toHaveLength(1);
  });

  it("closes the attempt: no more answers after it is finished", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId);
    await finishAttempt(learner, attemptId);
    expect(await submitAnswer(learner, attemptId, set.basics[0]!.id, 1)).toEqual({
      ok: false,
      code: "attempt_closed",
    });
  });

  it("leaves the attempt untouched when saving the result fails (one transaction)", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId);
    // A leftover result row makes the insert inside the transaction fail after the status update ran.
    await db.insert(chatResults).values({
      attemptId,
      setVersion: set.version,
      scores: {},
      stageStatus: {},
    });
    await expect(finishAttempt(learner, attemptId)).rejects.toThrow();
    const attempt = await attemptRow(attemptId);
    expect(attempt.status).toBe("in_progress");
    expect(attempt.completedAt).toBeNull();
  });
});

describe("a stage with all-same answers", () => {
  it("is reported, keeps the attempt open, and only that stage can be cleared and asked again", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    const riasecIds = new Set(set.items.filter((i) => i.stage === "riasec").map((i) => i.id));
    await answerAll(learner, attemptId, (index) => (riasecIds.has(set.items[index]!.id) ? 3 : (index % 5) + 1));

    expect(await finishAttempt(learner, attemptId)).toEqual({ ok: false, code: "stage_invalid", stage: "riasec" });
    expect((await attemptRow(attemptId)).status).toBe("in_progress");

    const before = await answerRows(attemptId);
    const retry = await retryStage(learner, attemptId, "riasec");
    if (!retry.ok) throw new Error(retry.code);
    const after = await answerRows(attemptId);
    expect(before.length - after.length).toBe(riasecIds.size);
    expect(after.some((r) => riasecIds.has(r.questionId))).toBe(false);
    expect(after.some((r) => !riasecIds.has(r.questionId))).toBe(true); // personality and basics are kept
    expect(retry.next.kind).toBe("question");
    if (retry.next.kind === "question") expect(retry.next.stage).toBe("riasec");

    await answerAll(learner, attemptId);
    expect((await finishAttempt(learner, attemptId)).ok).toBe(true);
  });

  it("does not let a learner clear a stage that is fine, or a stage that does not exist", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId);
    expect(await retryStage(learner, attemptId, "ocean")).toEqual({ ok: false, code: "not_allowed" });
    expect(await retryStage(learner, attemptId, "riasec")).toEqual({ ok: false, code: "not_allowed" });
    for (const stage of ["basics", "x", "", "__proto__", "constructor"]) {
      expect(await retryStage(learner, attemptId, stage), stage).toEqual({ ok: false, code: "invalid_input" });
    }
    expect((await answerRows(attemptId)).length).toBe(set.basics.length + set.items.length);
  });
});

describe("retake and abandon", () => {
  it("retake while an attempt is open resumes it (no pile of empty attempts)", async () => {
    const learner = await makeLearner();
    const first = await start(learner);
    const again = await retake(learner);
    if (!again.ok) throw new Error(again.code);
    expect(again.attemptId).toBe(first.attemptId);
    expect(again.resumed).toBe(true);
  });

  it("after finishing, retake creates a new attempt and the old report stays until the new one completes", async () => {
    const learner = await makeLearner();
    const first = await start(learner);
    await answerAll(learner, first.attemptId);
    const done = await finishAttempt(learner, first.attemptId);
    if (!done.ok) throw new Error(done.code);

    const again = await retake(learner);
    if (!again.ok) throw new Error(again.code);
    expect(again.attemptId).not.toBe(first.attemptId);
    expect(again.resumed).toBe(false);
    expect((await getLatestResult(learner.userId))?.attemptId).toBe(first.attemptId);

    await answerAll(learner, again.attemptId, (i) => ((i * 2) % 5) + 1);
    const second = await finishAttempt(learner, again.attemptId);
    if (!second.ok) throw new Error(second.code);
    expect((await getLatestResult(learner.userId))?.attemptId).toBe(again.attemptId);
    const all = await db.select().from(chatAttempts).where(eq(chatAttempts.userId, learner.userId));
    expect(all).toHaveLength(2); // every attempt is kept
  });

  it("returns null when the learner has no completed attempt", async () => {
    const learner = await makeLearner();
    await start(learner);
    expect(await getLatestResult(learner.userId)).toBeNull();
  });

  it("an abandoned attempt is never resumed: the next start creates a new one", async () => {
    const learner = await makeLearner();
    const first = await start(learner);
    expect(await abandonAttempt(learner, first.attemptId)).toEqual({ ok: true });
    expect(await submitAnswer(learner, first.attemptId, set.basics[0]!.id, 0)).toEqual({
      ok: false,
      code: "attempt_closed",
    });
    expect(await getNextStep(learner, first.attemptId)).toEqual({ ok: false, code: "attempt_closed" });
    const next = await start(learner);
    expect(next.attemptId).not.toBe(first.attemptId);
    expect(next.resumed).toBe(false);
  });
});

describe("question set version", () => {
  it("answers 'unknown' (not a crash) for an attempt whose question set is not in the code", async () => {
    const learner = await makeLearner();
    const [row] = await db
      .insert(chatAttempts)
      .values({ userId: learner.userId, setVersion: "0.0.0-missing" })
      .returning();
    expect(await getNextStep(learner, row!.id)).toEqual({ ok: false, code: "unknown" });
    expect(await finishAttempt(learner, row!.id)).toEqual({ ok: false, code: "unknown" });
    expect(await startOrResumeAttempt(learner)).toEqual({ ok: false, code: "unknown" });
  });
});

describe("the typed name", () => {
  /** Saves the name like auth's updateProfileName would (raw SQL, so this test needs no auth code). */
  const saver = () =>
    vi.fn(async (userId: string, name: string) => {
      await db.execute(sql`update auth_user set name = ${name} where id = ${userId}`);
      return { ok: true };
    });
  const nameOf = async (userId: string) =>
    (await db.execute<{ name: string }>(sql`select name from auth_user where id = ${userId}`)).rows[0]!.name;

  it("saves a good name on the profile (trimmed) and moves on to the basics", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    const save = saver();
    const res = await submitName(learner, attemptId, "  Asha  ", save);
    if (!res.ok) throw new Error(res.code);
    expect(save).toHaveBeenCalledExactlyOnceWith(learner.userId, "Asha");
    expect(await nameOf(learner.userId)).toBe("Asha");
    expect(res.next.kind).toBe("basics");
    expect(await answerRows(attemptId)).toHaveLength(0); // the name is not an answer row
  });

  it("asks again for a name with the wrong format and saves nothing", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    const save = saver();
    for (const bad of ["", "   ", "R2D2", "<script>", "x".repeat(31), "Asha!!"]) {
      expect(await submitName(learner, attemptId, bad, save), JSON.stringify(bad)).toEqual({
        ok: false,
        code: "name_format",
      });
    }
    expect(save).not.toHaveBeenCalled();
    expect((await attemptRow(attemptId)).status).toBe("in_progress");
  });

  it("asks again for an abuse word, without ending the attempt or showing the helpline", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    const save = saver();
    for (const word of ["idiot", "madarchod", "चूतिया"]) {
      expect(await submitName(learner, attemptId, word, save), word).toEqual({ ok: false, code: "name_format" });
    }
    expect(save).not.toHaveBeenCalled();
    expect((await attemptRow(attemptId)).status).toBe("in_progress");
    // The learner can still give a real name afterwards.
    expect((await submitName(learner, attemptId, "Asha", save)).ok).toBe(true);
  });

  it("refuses a look-alike spelling as a bad format, and saves nothing", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    const save = saver();
    expect(await submitName(learner, attemptId, "ѕuicide", save)).toEqual({ ok: false, code: "name_format" });
    expect(save).not.toHaveBeenCalled();
  });

  it("ends the attempt on a blocked word: nothing saved, never resumed, the next start is a new attempt", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    const save = saver();
    expect(await submitName(learner, attemptId, "I want to die", save)).toEqual({ ok: false, code: "name_blocked" });
    expect(save).not.toHaveBeenCalled();
    expect(await nameOf(learner.userId)).toBe("");
    expect((await attemptRow(attemptId)).status).toBe("abandoned");
    expect(await submitAnswer(learner, attemptId, set.basics[0]!.id, 0)).toEqual({ ok: false, code: "attempt_closed" });
    const again = await start(learner);
    expect(again.attemptId).not.toBe(attemptId);
  });

  it("reports a failed profile save as our problem (unknown), not as a bad name", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    expect(await submitName(learner, attemptId, "Asha", async () => ({ ok: false }))).toEqual({
      ok: false,
      code: "unknown",
    });
  });

  it("does not return a next step for an attempt that was ended while the name was being saved", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    const endsItMeanwhile = async (userId: string, name: string) => {
      await db.execute(sql`update auth_user set name = ${name} where id = ${userId}`);
      await abandonAttempt(learner, attemptId); // another request got there first
      return { ok: true };
    };
    expect(await submitName(learner, attemptId, "Asha", endsItMeanwhile)).toEqual({
      ok: false,
      code: "attempt_closed",
    });
  });

  it("does nothing for someone else's attempt or a finished one", async () => {
    const owner = await makeLearner("");
    const stranger = await makeLearner("");
    const { attemptId } = await start(owner);
    const save = saver();
    expect(await submitName(stranger, attemptId, "Asha", save)).toEqual({ ok: false, code: "not_found" });
    expect(await submitName(stranger, attemptId, "I want to die", save)).toEqual({ ok: false, code: "not_found" });
    expect((await attemptRow(attemptId)).status).toBe("in_progress"); // a stranger cannot end it with a blocked word
    await abandonAttempt(owner, attemptId);
    expect(await submitName(owner, attemptId, "Asha", save)).toEqual({ ok: false, code: "attempt_closed" });
    expect(save).not.toHaveBeenCalled();
  });
});

describe("funnel events", () => {
  const sent = (spy: { mock: { calls: unknown[][] } }) =>
    spy.mock.calls.map(([session, event, props]) => ({ session, event: event as string, props }));
  const named = (spy: { mock: { calls: unknown[][] } }, event: string) => sent(spy).filter((e) => e.event === event);
  const spyOnTrack = () => vi.spyOn(analytics, "track").mockImplementation(() => {});
  afterEach(() => vi.restoreAllMocks());

  it("sends one event per step, per finished part and one on completion, all under the attempt id", async () => {
    const learner = await makeLearner("Zorbaxian");
    const spy = spyOnTrack();
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId);
    await finishAttempt(learner, attemptId);

    expect(named(spy, "chat_started")).toEqual([{ session: attemptId, event: "chat_started", props: {} }]);
    const steps = named(spy, "chat_step");
    expect(steps).toHaveLength(order.length - 1); // the name is already on the profile
    expect(steps.every((e) => e.session === attemptId)).toBe(true);
    expect(steps[0]!.props).toMatchObject({ stage: "basics", messageNumber: 1, inputType: "single" });
    expect(steps.at(-1)!.props).toMatchObject({ messageNumber: order.length, inputType: "likert" });
    expect(named(spy, "chat_stage_completed").map((e) => (e.props as { stage: string }).stage)).toEqual([
      "basics",
      ...new Set(set.items.map((i) => i.stage)),
    ]);
    expect(named(spy, "chat_completed")).toHaveLength(1);
    expect(named(spy, "chat_completed")[0]!.props).toEqual({
      setVersion: set.version,
      hollandClose: expect.any(Boolean),
      flat: expect.any(Boolean),
      durationSeconds: expect.any(Number),
    });
    // No name, no answer text: only numbers, stages and fixed words.
    expect(JSON.stringify(sent(spy))).not.toContain("Zorbaxian");
  });

  it("does not count a second tap on the same question as a new step", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    const spy = spyOnTrack();
    const basics = set.basics[0]!.id;
    await submitAnswer(learner, attemptId, basics, 0);
    await submitAnswer(learner, attemptId, basics, 1);
    expect(named(spy, "chat_step")).toHaveLength(1);
  });

  it("sends chat_started for a new attempt only, and chat_retake only for a retake that makes a new attempt", async () => {
    const learner = await makeLearner();
    const spy = spyOnTrack();
    const { attemptId } = await start(learner);
    await start(learner); // resumes
    await retake(learner); // resumes too
    expect(named(spy, "chat_started")).toHaveLength(1);
    expect(named(spy, "chat_retake")).toHaveLength(0);

    await answerAll(learner, attemptId);
    await finishAttempt(learner, attemptId);
    const again = await retake(learner);
    if (!again.ok) throw new Error(again.code);
    expect(named(spy, "chat_started")).toHaveLength(2);
    expect(named(spy, "chat_retake")).toEqual([{ session: again.attemptId, event: "chat_retake", props: {} }]);
  });

  it("sends chat_completed once, even if finish is called twice", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId);
    const spy = spyOnTrack();
    await finishAttempt(learner, attemptId);
    await finishAttempt(learner, attemptId);
    expect(named(spy, "chat_completed")).toHaveLength(1);
  });

  it("sends chat_invalid with the part when its answers are all the same", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    const riasecIds = new Set(set.items.filter((i) => i.stage === "riasec").map((i) => i.id));
    await answerAll(learner, attemptId, (index) => (riasecIds.has(set.items[index]!.id) ? 3 : (index % 5) + 1));
    const spy = spyOnTrack();
    await finishAttempt(learner, attemptId);
    expect(named(spy, "chat_invalid")).toEqual([
      { session: attemptId, event: "chat_invalid", props: { reason: "stage_invalid", stage: "riasec" } },
    ]);
    expect(named(spy, "chat_completed")).toHaveLength(0);
  });

  it("reports every refused name the same way, so the sensitive case is not singled out, and never the text", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    const spy = spyOnTrack();
    const save = vi.fn(async () => ({ ok: true }));
    await submitName(learner, attemptId, "R2D2", save);
    await submitName(learner, attemptId, "idiot", save);
    await submitName(learner, attemptId, "I want to die", save);
    expect(named(spy, "chat_invalid").map((e) => e.props)).toEqual(Array(3).fill({ reason: "name_rejected" }));
    expect(named(spy, "chat_step")).toHaveLength(0);
    expect(JSON.stringify(sent(spy))).not.toMatch(/R2D2|idiot|die/);
  });

  it("sends a name step when a good name is saved", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    const spy = spyOnTrack();
    const save = vi.fn(async () => ({ ok: true }));
    await submitName(learner, attemptId, "Asha", save);
    expect(named(spy, "chat_step")).toEqual([
      {
        session: attemptId,
        event: "chat_step",
        props: { stage: "basics", messageNumber: 2, inputType: "name", secondsTaken: expect.any(Number) },
      },
    ]);
  });

  it("still saves the answer when analytics breaks (it throws, or rejects)", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    const spy = vi.spyOn(analytics, "track").mockImplementation(() => {
      throw new Error("analytics down");
    });
    const first = await submitAnswer(learner, attemptId, set.basics[0]!.id, 0);
    expect(first.ok).toBe(true);
    spy.mockImplementation(() => Promise.reject(new Error("analytics down")));
    const second = await submitAnswer(learner, attemptId, set.basics[1]!.id, 0);
    expect(second.ok).toBe(true);
    expect(await answerRows(attemptId)).toHaveLength(2);
  });
});

describe("the free report", () => {
  afterEach(() => vi.restoreAllMocks());

  const finished = async (learner: Learner) => {
    const { attemptId } = await start(learner);
    await answerAll(learner, attemptId);
    const res = await finishAttempt(learner, attemptId);
    if (!res.ok) throw new Error(res.code);
    return attemptId;
  };
  const latest = async (learner: Learner) => {
    const res = await getLatestReport(learner.userId);
    if (!res.ok) throw new Error(res.code);
    return res.latest;
  };

  it("has no report before the learner has finished an attempt", async () => {
    const learner = await makeLearner();
    expect(await latest(learner)).toBeNull();
    await start(learner); // an open attempt is not a report
    expect(await latest(learner)).toBeNull();
  });

  it("stamps the wording version when the attempt finishes and builds the report from the stored result", async () => {
    const learner = await makeLearner();
    const attemptId = await finished(learner);
    const [stored] = await db.select().from(chatResults).where(eq(chatResults.attemptId, attemptId));
    expect(stored!.reportVersion).toBe(CURRENT_REPORT_COPY.version);

    const got = await latest(learner);
    expect(got!.attemptId).toBe(attemptId);
    const { report } = got!;
    expect(report.copyVersion).toBe(CURRENT_REPORT_COPY.version);
    expect(report.draft).toBe(CURRENT_REPORT_COPY.draft);
    expect(report.traits.map((t) => t.trait)).toEqual(["O", "C", "E", "A", "N"]);
    expect(report.interests).toHaveLength(6);
    expect(report.courses.length).toBeGreaterThan(0);
    expect(report.courses.length).toBeLessThanOrEqual(3);
    expect(report.footer).toBe(CURRENT_REPORT_COPY.footer);
  });

  it("reads an old result with its own wording even after newer wording exists", async () => {
    const learner = await makeLearner();
    const attemptId = await finished(learner);
    const registry = REPORT_COPIES as Record<string, ReportCopy>;
    const older: ReportCopy = { ...CURRENT_REPORT_COPY, version: "0.0.1-test", footer: "FOOTER OF THE OLD WORDING" };
    registry[older.version] = older;
    try {
      await db.update(chatResults).set({ reportVersion: older.version }).where(eq(chatResults.attemptId, attemptId));
      expect((await latest(learner))!.report.footer).toBe("FOOTER OF THE OLD WORDING");
    } finally {
      delete registry[older.version];
    }
  });

  it("fails with a fixed code, not a crash, when a result names a wording version nobody has", async () => {
    const learner = await makeLearner();
    const attemptId = await finished(learner);
    await db.update(chatResults).set({ reportVersion: "9.9.9" }).where(eq(chatResults.attemptId, attemptId));
    expect(await getLatestReport(learner.userId)).toEqual({ ok: false, code: "unknown" });
  });

  it("only ever shows a learner their own report, and the newest completed one after a retake", async () => {
    const [mine, theirs] = [await makeLearner(), await makeLearner()];
    const first = await finished(mine);
    expect(await latest(theirs)).toBeNull();
    expect((await latest(mine))!.attemptId).toBe(first);
    const second = await finished(mine);
    expect((await latest(mine))!.attemptId).toBe(second);
    expect(await latest(theirs)).toBeNull();
  });

  it("sends no event when the report is read; the page fires report_viewed itself, under the attempt id", async () => {
    const learner = await makeLearner();
    const attemptId = await finished(learner);
    const spy = vi.spyOn(analytics, "track").mockImplementation(() => {});
    const got = await latest(learner);
    expect(spy).not.toHaveBeenCalled();
    trackReportViewed(got!.attemptId, got!.report);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(attemptId, "report_viewed", {
      scoresPresent: true,
      coursesSuggested: got!.report.courses.length,
    });
  });

  it("records a report button click as a fixed code, and nothing for a learner without a report", async () => {
    const learner = await makeLearner();
    const spy = vi.spyOn(analytics, "track").mockImplementation(() => {});
    expect(await recordReportAction(learner, "pdf")).toEqual({ ok: false, code: "not_found" });
    expect(spy).not.toHaveBeenCalled();
    const attemptId = await finished(learner);
    spy.mockClear();
    expect(await recordReportAction(learner, "callback")).toEqual({ ok: true });
    expect(spy).toHaveBeenCalledWith(attemptId, "report_action", { action: "callback" });
  });
});

describe("callback context (what the team needs before a call)", () => {
  const finishWithAge = async (learner: Learner, ageIndex: number) => {
    const { attemptId } = await start(learner);
    await submitAnswer(learner, attemptId, "b-status", 0); // status is asked first
    await submitAnswer(learner, attemptId, "b-age", ageIndex);
    await answerAll(learner, attemptId);
    const res = await finishAttempt(learner, attemptId);
    if (!res.ok) throw new Error(res.code);
    return attemptId;
  };

  it("is null until the learner has a finished attempt", async () => {
    const learner = await makeLearner();
    expect(await getCallbackContext(learner.userId)).toBeNull();
    await start(learner);
    expect(await getCallbackContext(learner.userId)).toBeNull();
  });

  it("carries the age, status and goal labels, the top interest names and the attempt id, and no name or phone", async () => {
    const learner = await makeLearner("Zorbaxian");
    const attemptId = await finishWithAge(learner, 3); // "22 to 25"
    const context = await getCallbackContext(learner.userId);
    expect(context).toMatchObject({ attemptId, age: "22 to 25" });
    expect(context!.status).toBe(set.basics.find((b) => b.id === "b-status")!.options[0]!.label);
    expect(context!.goal).toBe(set.basics.find((b) => b.id === "b-goal")!.options[0]!.label);
    expect(context!.activity).toBe(set.basics.find((b) => b.id === "b-activity")!.options[0]!.label);
    expect(context!.topInterests.length).toBeLessThanOrEqual(3);
    expect(JSON.stringify(context)).not.toContain("Zorbaxian");
  });

  it("has no minor flag for any age (D79): the age is just a label for the team", async () => {
    const young = await makeLearner();
    await finishWithAge(young, 0); // under 15
    const context = await getCallbackContext(young.userId);
    expect(context).toMatchObject({ age: "Under 15" });
    expect(context).not.toHaveProperty("minor");
  });

  it("follows the newest finished attempt after a retake", async () => {
    const learner = await makeLearner();
    await finishWithAge(learner, 0);
    await retake(learner);
    const second = await finishWithAge(learner, 4);
    const context = await getCallbackContext(learner.userId);
    expect(context).toMatchObject({ attemptId: second, age: "26 or older" });
  });

  it("gives the admin the context of one attempt, and nothing for an open or unknown attempt", async () => {
    const learner = await makeLearner();
    const open = (await start(learner)).attemptId;
    expect(await getCallbackContextForAdmin(open)).toBeNull();
    expect(await getCallbackContextForAdmin("00000000-0000-4000-8000-000000000000")).toBeNull();
    await submitAnswer(learner, open, "b-status", 0);
    await submitAnswer(learner, open, "b-age", 1);
    await answerAll(learner, open);
    await finishAttempt(learner, open);
    expect(await getCallbackContextForAdmin(open)).toMatchObject({ attemptId: open, age: "15 to 17" });
  });
});

describe("continue or start again (E4-S12, D75)", () => {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const backdate = (attemptId: string, days: number, column: "lastAnswerAt" | "startedAt" = "lastAnswerAt") =>
    db
      .update(chatAttempts)
      .set({ [column]: new Date(Date.now() - days * DAY_MS) })
      .where(eq(chatAttempts.id, attemptId));
  const backdateMinutes = (attemptId: string, minutes: number) =>
    db
      .update(chatAttempts)
      .set({ lastAnswerAt: new Date(Date.now() - minutes * 60 * 1000) })
      .where(eq(chatAttempts.id, attemptId));
  const firstBasic = set.basics[0]!;

  it("offers nothing to a learner with no attempt, or an attempt with no answers (that one just resumes)", async () => {
    const learner = await makeLearner();
    expect(await getResumeOffer(learner)).toEqual({ kind: "none" });
    await start(learner);
    expect(await getResumeOffer(learner)).toEqual({ kind: "none" });
  });

  it("offers the choice to a returning learner, with how far they got", async () => {
    const learner = await makeLearner("Asha");
    const { attemptId } = await start(learner);
    await submitAnswer(learner, attemptId, firstBasic.id, 0);
    await backdateMinutes(attemptId, 31);
    // The name (already on the profile) and the one basic answer count as answered.
    expect(await getResumeOffer(learner)).toEqual({ kind: "offer", attemptId, answered: 2, total: order.length });
  });

  it("does not ask after a quick refresh: the learner answered a moment ago", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await submitAnswer(learner, attemptId, firstBasic.id, 0);
    expect(await getResumeOffer(learner)).toEqual({ kind: "none" });
    await backdateMinutes(attemptId, 29);
    expect(await getResumeOffer(learner)).toEqual({ kind: "none" });
    expect(await hasOpenAttempt(learner.userId)).toBe(true); // still resumable, just not asked about
  });

  it("still offers it 29 days after the last answer", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await submitAnswer(learner, attemptId, firstBasic.id, 0);
    await backdate(attemptId, 29);
    expect((await getResumeOffer(learner)).kind).toBe("offer");
    expect(await hasOpenAttempt(learner.userId)).toBe(true);
  });

  it("expires an attempt 31 days after the last answer: closed when read, and the next start is fresh", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await submitAnswer(learner, attemptId, firstBasic.id, 0);
    await backdate(attemptId, 31);
    expect(await getResumeOffer(learner)).toEqual({ kind: "none" });
    expect((await attemptRow(attemptId)).status).toBe("abandoned");
    const fresh = await start(learner);
    expect(fresh.attemptId).not.toBe(attemptId);
    expect(fresh.resumed).toBe(false);
    expect(await answerRows(attemptId)).toHaveLength(1); // the old answers are kept
  });

  it("expires an empty attempt from its start time", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await backdate(attemptId, 31, "startedAt");
    const fresh = await start(learner);
    expect(fresh.attemptId).not.toBe(attemptId);
    expect((await attemptRow(attemptId)).status).toBe("abandoned");
  });

  it("does not hide a saved result behind an expired open attempt", async () => {
    const learner = await makeLearner();
    const done = await start(learner);
    await answerAll(learner, done.attemptId);
    await finishAttempt(learner, done.attemptId);
    const again = await retake(learner);
    if (!again.ok) throw new Error("retake failed");
    await backdate(again.attemptId, 31, "startedAt");
    expect(await hasOpenAttempt(learner.userId)).toBe(false);
    expect((await getLatestResult(learner.userId))?.attemptId).toBe(done.attemptId);
  });

  it("start again closes the open attempt, keeps its answers and begins a new one at the first question", async () => {
    const learner = await makeLearner("Asha");
    const { attemptId } = await start(learner);
    await submitAnswer(learner, attemptId, firstBasic.id, 0);
    const res = await restartAttempt(learner, attemptId);
    if (!res.ok) throw new Error(`restart failed: ${res.code}`);
    expect(res.attemptId).not.toBe(attemptId);
    expect(res.resumed).toBe(false);
    expect(res.next).toMatchObject({ kind: "basics", id: firstBasic.id });
    expect((await attemptRow(attemptId)).status).toBe("abandoned");
    expect(await answerRows(attemptId)).toHaveLength(1);
    expect(await getResumeOffer(learner)).toEqual({ kind: "none" });
  });

  it("start again on an attempt that is already closed changes nothing and says attempt_closed (a stale tab)", async () => {
    const learner = await makeLearner("Asha");
    const old = await start(learner);
    await submitAnswer(learner, old.attemptId, firstBasic.id, 0);
    const first = await restartAttempt(learner, old.attemptId); // tab B tapped Start again
    if (!first.ok) throw new Error(first.code);
    await submitAnswer(learner, first.attemptId, firstBasic.id, 0);

    // Tab A still shows the old welcome-back screen and taps Start again too: the new attempt must survive.
    expect(await restartAttempt(learner, old.attemptId)).toEqual({ ok: false, code: "attempt_closed" });
    expect((await attemptRow(first.attemptId)).status).toBe("in_progress");
    expect(await answerRows(first.attemptId)).toHaveLength(1);
  });

  it("start again refuses an unknown attempt id", async () => {
    const learner = await makeLearner();
    await start(learner);
    expect(await restartAttempt(learner, "00000000-0000-4000-8000-000000000000")).toEqual({
      ok: false,
      code: "not_found",
    });
    expect(await restartAttempt(learner, "nope")).toEqual({ ok: false, code: "not_found" });
  });

  it("only ever touches the learner's own attempts", async () => {
    const mine = await makeLearner();
    const other = await makeLearner();
    await start(mine);
    const theirs = await start(other);
    await submitAnswer(other, theirs.attemptId, firstBasic.id, 0);
    // Someone else's attempt id looks like a missing one, and nothing of theirs changes.
    expect(await restartAttempt(mine, theirs.attemptId)).toEqual({ ok: false, code: "not_found" });
    expect((await attemptRow(theirs.attemptId)).status).toBe("in_progress");
  });
});

describe("the Home mini-chat answer (D87)", () => {
  const status = () => set.basics.find((b) => b.id === set.homeQuestionId)!;
  const optionIndex = (id: string) => status().options.findIndex((o) => o.id === id);

  it("saves the answer as the home question's answer, then the next step asks the name", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    const res = await applyHomeAnswer(learner, attemptId, "college");
    if (!res.ok) throw new Error(res.code);
    expect(res.applied).toBe(true);
    expect(res.next.kind).toBe("name");
    const rows = await answerRows(attemptId);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ questionId: status().id, value: optionIndex("college"), variantId: null });
  });

  it("does nothing the second time (refresh or two tabs): one row, same value", async () => {
    const learner = await makeLearner("");
    const { attemptId } = await start(learner);
    await applyHomeAnswer(learner, attemptId, "college");
    const again = await applyHomeAnswer(learner, attemptId, "working");
    if (!again.ok) throw new Error(again.code);
    expect(again.applied).toBe(false);
    const rows = await answerRows(attemptId);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.value).toBe(optionIndex("college"));
  });

  it("never changes a quiz that is already under way", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    await submitAnswer(learner, attemptId, status().id, optionIndex("working"));
    const res = await applyHomeAnswer(learner, attemptId, "school");
    if (!res.ok) throw new Error(res.code);
    expect(res.applied).toBe(false);
    expect((await answerRows(attemptId))[0]!.value).toBe(optionIndex("working"));
  });

  it("refuses an option that is not in the question, saving nothing", async () => {
    const learner = await makeLearner();
    const { attemptId } = await start(learner);
    expect(await applyHomeAnswer(learner, attemptId, "astronaut")).toEqual({ ok: false, code: "invalid_input" });
    expect(await answerRows(attemptId)).toHaveLength(0);
  });

  it("is not_found for someone else's attempt, and attempt_closed for a closed one", async () => {
    const owner = await makeLearner();
    const stranger = await makeLearner();
    const { attemptId } = await start(owner);
    expect(await applyHomeAnswer(stranger, attemptId, "school")).toMatchObject({ ok: false, code: "not_found" });
    await abandonAttempt(owner, attemptId);
    expect(await applyHomeAnswer(owner, attemptId, "school")).toMatchObject({ ok: false, code: "attempt_closed" });
  });
});
