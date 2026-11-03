import { describe, expect, it } from "vitest";
import {
  acknowledgementFor,
  checkAnswer,
  computeNextStep,
  firstUnanswered,
  isReachable,
  progressOf,
  questionOrder,
  stageOrder,
  stageQuestionIds,
  type SavedAnswers,
} from "./flow";
import { CURRENT_QUESTION_SET, type QuestionSet } from "./question-set";

const set = CURRENT_QUESTION_SET;
const order = questionOrder(set);
const withName = { attemptId: "attempt-1", hasName: true };
const noName = { attemptId: "attempt-1", hasName: false };

/** Answers for the first `count` questions after the name, using a legal value for each. */
const answered = (count: number): SavedAnswers =>
  Object.fromEntries(order.slice(1, 1 + count).map((entry) => [entry.id, entry.kind === "basics" ? 0 : 3] as const));

describe("question order and stages (all read from the set)", () => {
  it("asks the name, then the basics, then every scored item in the set's order", () => {
    expect(order[0]).toEqual({ id: set.name.id, stage: "basics", kind: "name" });
    expect(order.slice(1, 1 + set.basics.length).map((e) => e.id)).toEqual(set.basics.map((b) => b.id));
    expect(order.slice(1 + set.basics.length).map((e) => e.id)).toEqual(set.items.map((i) => i.id));
    expect(order).toHaveLength(1 + set.basics.length + set.items.length);
  });

  it("lists the stages in the order they appear", () => {
    expect(stageOrder(set)).toEqual(["basics", "ocean", "riasec"]);
  });

  it("follows a different set without any code change (nothing is hardcoded)", () => {
    const small: QuestionSet = { ...set, items: set.items.filter((i) => i.id === "o-O-1" || i.id === "r-R-1") };
    expect(questionOrder(small)).toHaveLength(1 + small.basics.length + 2);
    expect(progressOf(small, {}, false).total).toBe(1 + small.basics.length + 2);
    const noRiasec: QuestionSet = { ...set, items: set.items.filter((i) => i.stage === "ocean") };
    expect(stageOrder(noRiasec)).toEqual(["basics", "ocean"]);
  });
});

describe("progress", () => {
  it("starts at zero with totals taken from the set", () => {
    const progress = progressOf(set, {}, false);
    expect(progress.answered).toBe(0);
    expect(progress.total).toBe(order.length);
    expect(progress.stages.map((s) => s.total)).toEqual(
      stageOrder(set).map((id) => order.filter((e) => e.stage === id).length),
    );
  });

  it("counts the name as answered once the profile has one", () => {
    expect(progressOf(set, {}, true).answered).toBe(1);
    expect(progressOf(set, {}, true).stages[0]).toEqual({ id: "basics", answered: 1, total: 1 + set.basics.length });
  });

  it("counts every saved answer and ignores unknown keys", () => {
    const progress = progressOf(set, { ...answered(5), "x-unknown": 4 }, true);
    expect(progress.answered).toBe(1 + 5);
  });
});

describe("resume: the next question is the first one without an answer", () => {
  it("is the name for a learner without one", () => {
    expect(computeNextStep(set, {}, noName).kind).toBe("name");
  });

  it("skips the name when the profile already has one (a returning learner)", () => {
    const step = computeNextStep(set, {}, withName);
    expect(step.kind).toBe("basics");
    if (step.kind === "basics") expect(step.id).toBe(set.basics[0]!.id);
  });

  it("moves on one question at a time, with no counter stored anywhere", () => {
    for (const n of [0, 1, 2, 3, 4, 10, set.basics.length + set.items.length - 1]) {
      const entry = firstUnanswered(set, answered(n), true)!;
      expect(entry.id, `after ${n}`).toBe(order[1 + n]!.id);
    }
  });

  it("finds a gap left by an earlier question (resume goes back to it)", () => {
    const answers = { ...answered(6) } as Record<string, number>;
    const gap = order[3]!.id;
    delete answers[gap];
    expect(firstUnanswered(set, answers, true)!.id).toBe(gap);
  });

  it("is done when everything is answered", () => {
    const step = computeNextStep(set, answered(set.basics.length + set.items.length), withName);
    expect(step).toEqual({
      kind: "done",
      progress: progressOf(set, answered(set.basics.length + set.items.length), true),
    });
  });
});

describe("what a step carries", () => {
  const firstScored = order.findIndex((e) => e.kind === "question");
  const stepAt = (attemptId: string) => computeNextStep(set, answered(firstScored - 1), { attemptId, hasName: true });

  it("gives a basics question its prompt and options by position", () => {
    const step = computeNextStep(set, {}, withName);
    if (step.kind !== "basics") throw new Error("expected basics");
    expect(step.options.map((o) => o.index)).toEqual(set.basics[0]!.options.map((_, i) => i));
    expect(step.options.map((o) => o.label)).toEqual(set.basics[0]!.options.map((o) => o.label));
  });

  it("gives a scored question one of its own wordings, the scale and the stage's prompt", () => {
    const step = stepAt("attempt-1");
    if (step.kind !== "question") throw new Error("expected question");
    const item = set.items.find((i) => i.id === step.id)!;
    expect(item.variants.map((v) => v.id)).toContain(step.variantId);
    expect(item.variants.map((v) => v.text)).toContain(step.text);
    expect(step.stage).toBe(item.stage);
    expect(step.scale).toEqual({ prompt: set.scales[item.stage].prompt, labels: set.scales[item.stage].labels });
  });

  it("shows the same wording for the same attempt every time (a refresh does not change it)", () => {
    expect(stepAt("attempt-9")).toEqual(stepAt("attempt-9"));
  });

  it("does not show everyone the same wording (the attempt picks it)", () => {
    const wordings = new Set<string>();
    for (let n = 0; n < 60; n++) {
      const step = stepAt(`attempt-${n}`);
      if (step.kind === "question") wordings.add(step.variantId);
    }
    expect(wordings.size).toBe(3);
  });

  it("never carries a key, a score or a source (the UI must not see how it is scored)", () => {
    const text = JSON.stringify(stepAt("attempt-1"));
    expect(text).not.toMatch(/"key"|"source"|"score"|"dimension"/);
  });
});

describe("checkAnswer", () => {
  const firstBasic = set.basics[0]!;
  const scored = set.items[0]!;

  it("accepts an option position for a basics question and 1 to 5 for a scored one", () => {
    expect(checkAnswer(set, firstBasic.id, 0)).toEqual({ ok: true, kind: "basics", stage: "basics" });
    expect(checkAnswer(set, firstBasic.id, firstBasic.options.length - 1).ok).toBe(true);
    for (const value of [1, 2, 3, 4, 5]) expect(checkAnswer(set, scored.id, value).ok).toBe(true);
  });

  it("rejects values outside the scale or the option list, and non-integers", () => {
    expect(checkAnswer(set, firstBasic.id, firstBasic.options.length).ok).toBe(false);
    expect(checkAnswer(set, firstBasic.id, -1).ok).toBe(false);
    for (const bad of [0, 6, 2.5, Number.NaN, Number.POSITIVE_INFINITY, "3", null, undefined])
      expect(checkAnswer(set, scored.id, bad).ok, String(bad)).toBe(false);
  });

  it("rejects an unknown question and the name (the name is not an answer)", () => {
    expect(checkAnswer(set, "x-nope", 3).ok).toBe(false);
    expect(checkAnswer(set, set.name.id, 1).ok).toBe(false);
  });
});

describe("isReachable", () => {
  it("allows the current question and earlier ones, not later ones", () => {
    const answers = answered(5);
    const current = firstUnanswered(set, answers, true)!;
    const earlier = order[2]!.id;
    const later = order[order.length - 1]!.id;
    expect(isReachable(set, answers, true, current.id)).toBe(true);
    expect(isReachable(set, answers, true, earlier)).toBe(true);
    expect(isReachable(set, answers, true, later)).toBe(false);
  });

  it("does not let a learner without a name answer the questions after it", () => {
    expect(isReachable(set, {}, false, set.basics[0]!.id)).toBe(false);
  });

  it("rejects an unknown question", () => {
    expect(isReachable(set, answered(3), true, "x-nope")).toBe(false);
  });

  it("allows anything once everything is answered (editing an old answer)", () => {
    const all = answered(set.basics.length + set.items.length);
    expect(isReachable(set, all, true, order[3]!.id)).toBe(true);
  });
});

describe("acknowledgementFor and stageQuestionIds", () => {
  it("uses the chosen option's reply for a basics question", () => {
    const basic = set.basics[1]!;
    expect(acknowledgementFor(set, "a", basic.id, 2)).toBe(basic.options[2]!.acknowledgement);
  });

  it("uses a generic line from the set for a scored question, stable for one attempt", () => {
    const line = acknowledgementFor(set, "a", set.items[0]!.id, 4);
    expect(set.acknowledgements).toContain(line);
    expect(acknowledgementFor(set, "a", set.items[0]!.id, 4)).toBe(line);
  });

  it("lists the scored questions of one stage, in the set's order", () => {
    expect(stageQuestionIds(set, "ocean")).toEqual(set.items.filter((i) => i.stage === "ocean").map((i) => i.id));
    expect(stageQuestionIds(set, "riasec")).toHaveLength(set.items.filter((i) => i.stage === "riasec").length);
  });
});
