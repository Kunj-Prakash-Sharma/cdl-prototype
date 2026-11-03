// Integration test: real chat service + real Postgres (the `self_test` database; see tests/support).
// No Better Auth and no Next here: the service takes the learner as a plain object, so only the database is real.
// Run with: npm run test:int
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { questionOrder } from "./flow";
import { CURRENT_QUESTION_SET } from "./question-set";
import { chatAnswers, chatAttempts, chatResults } from "./schema";
import {
  abandonAttempt,
  finishAttempt,
  getLatestResult,
  getNextStep,
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
  it("creates an attempt pinned to the current question set, starting at the name for a learner without one", async () => {
    const learner = await makeLearner("");
    const res = await start(learner);
    expect(res.resumed).toBe(false);
    expect(res.next.kind).toBe("name");
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
  it("saves an answer and returns the next step with Meera's reply", async () => {
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
    expect(await submitAnswer(learner, attemptId, set.basics[0]!.id, 0)).toEqual({ ok: false, code: "out_of_order" });
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
    for (const entry of order.slice(1, 1 + set.basics.length + 4)) {
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
