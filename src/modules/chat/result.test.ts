import { describe, expect, it } from "vitest";
import { CURRENT_QUESTION_SET, type QuestionSet } from "./question-set";
import type { ResultRow } from "./repo";
import { toResultRow, toResultView } from "./result";
import { scoreAttempt } from "./scoring";

const set = CURRENT_QUESTION_SET;

/** A varied answer for every scored item, so scoring is ok and has a Holland code. */
const answers = (pattern: (index: number) => number) =>
  Object.fromEntries(set.items.map((item, index) => [item.id, pattern(index)]));

const okScore = (pattern: (index: number) => number) => {
  const score = scoreAttempt(answers(pattern), set);
  if (score.status !== "ok") throw new Error(`expected ok, got ${score.status}`);
  return score;
};

const asRow = (draft: ReturnType<typeof toResultRow>): ResultRow => ({
  attemptId: draft.attemptId,
  setVersion: draft.setVersion,
  scores: draft.scores,
  holland: draft.holland ?? null,
  hollandClose: draft.hollandClose ?? false,
  flat: draft.flat ?? false,
  stageStatus: draft.stageStatus,
  createdAt: new Date(),
});

describe("toResultRow", () => {
  it("records the set version, both score blocks and the Holland code in rank order", () => {
    const score = okScore((i) => (i % 5) + 1);
    const row = toResultRow("attempt-1", set, score);
    expect(row.setVersion).toBe(set.version);
    expect(row.scores).toEqual({ ocean: score.ocean, riasec: score.riasec });
    if ("letters" in score.holland) {
      expect(row.holland).toBe(score.holland.letters.join(""));
      expect(row.hollandClose).toBe(score.holland.close);
      expect(row.flat).toBe(false);
    } else {
      expect(row.flat).toBe(true);
    }
  });

  it("builds stage_status from the stages in the set, one entry each (no stage names hardcoded)", () => {
    const score = okScore((i) => (i % 5) + 1);
    expect(toResultRow("a", set, score).stageStatus).toEqual({ ocean: "ok", riasec: "ok" });
    const oceanOnly: QuestionSet = { ...set, items: set.items.filter((i) => i.stage === "ocean") };
    expect(toResultRow("a", oceanOnly, score).stageStatus).toEqual({ ocean: "ok" });
  });

  it("stores no code for a flat profile", () => {
    // Interests all within 13 points but not all the same (so not straight-lining): flat.
    const score = okScore((i) => (set.items[i]!.stage === "riasec" ? (i % 2 === 0 ? 3 : 4) : (i % 5) + 1));
    expect("flat" in score.holland).toBe(true);
    const row = toResultRow("a", set, score);
    expect(row.holland).toBeNull();
    expect(row.flat).toBe(true);
    expect(row.hollandClose).toBe(false);
  });
});

describe("toResultView", () => {
  it("round-trips a result with a code", () => {
    const score = okScore((i) => (set.items[i]!.stage === "riasec" ? ((i * 3) % 5) + 1 : (i % 5) + 1));
    const view = toResultView(asRow(toResultRow("attempt-7", set, score)), new Date("2026-11-03T08:00:00Z"));
    expect(view).toEqual({
      attemptId: "attempt-7",
      setVersion: set.version,
      ocean: score.ocean,
      riasec: score.riasec,
      holland: score.holland,
      completedAt: "2026-11-03T08:00:00.000Z",
    });
  });

  it("round-trips a flat result as { flat: true }", () => {
    const score = okScore((i) => (set.items[i]!.stage === "riasec" ? (i % 2 === 0 ? 3 : 4) : (i % 5) + 1));
    const view = toResultView(asRow(toResultRow("a", set, score)), new Date());
    expect(view.holland).toEqual({ flat: true });
  });
});
