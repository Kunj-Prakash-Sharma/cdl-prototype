import { describe, expect, it } from "vitest";
import {
  acknowledgementFor,
  checkAnswer,
  completedStage,
  computeNextStep,
  firstUnanswered,
  homeAnswer,
  homeAnsweredView,
  homeQuestionView,
  isAway,
  isExpired,
  isReachable,
  progressOf,
  questionOrder,
  stageOrder,
  stageQuestionIds,
  type SavedAnswers,
} from "./flow";
import { QUESTION_SET_1_0_0, QUESTION_SET_1_1_0, type QuestionSet } from "./question-set";

// The generic flow tests use 1.0.0 (name first): attempts started on it keep that order. 1.1.0 has its own block below.
const set = QUESTION_SET_1_0_0;
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
    expect(progressOf(set, {}, true).stages[0]).toEqual({
      id: "basics",
      ...set.stageCopy.basics,
      answered: 1,
      total: 1 + set.basics.length,
    });
  });

  it("carries each part's wording and the last step's wording from the set", () => {
    const progress = progressOf(set, {}, false);
    for (const stage of progress.stages) {
      expect({ label: stage.label, title: stage.title, subtitle: stage.subtitle }).toEqual(set.stageCopy[stage.id]);
    }
    expect(progress.finishLabel).toBe(set.finishLabel);
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

describe("completedStage: which part did this answer finish?", () => {
  const stageIds = stageOrder(set);
  const idsOf = (stage: string) => order.filter((e) => e.stage === stage && e.kind !== "name").map((e) => e.id);
  const fill = (ids: string[]): SavedAnswers =>
    Object.fromEntries(ids.map((id) => [id, set.basics.some((b) => b.id === id) ? 0 : 3]));

  it("names the part when its last question gets answered", () => {
    for (const stage of stageIds.filter((id) => id !== "basics")) {
      const ids = idsOf(stage);
      const before = fill(ids.slice(0, -1));
      const after = fill(ids);
      expect(completedStage(progressOf(set, before, true), progressOf(set, after, true)), stage).toBe(stage);
    }
  });

  it("is null while the part still has questions left, and when nothing new finished", () => {
    const ids = idsOf("ocean");
    expect(
      completedStage(progressOf(set, fill(ids.slice(0, 1)), true), progressOf(set, fill(ids.slice(0, 2)), true)),
    ).toBeNull();
    const done = fill(ids);
    expect(completedStage(progressOf(set, done, true), progressOf(set, done, true))).toBeNull();
  });
});

describe("isExpired (the resume window, D75)", () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const daysAgo = (days: number) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  it("is live up to the window and expired just after it, judged from the last answer", () => {
    expect(isExpired({ startedAt: daysAgo(90), lastAnswerAt: daysAgo(29) }, now, 30)).toBe(false);
    expect(isExpired({ startedAt: daysAgo(90), lastAnswerAt: daysAgo(30) }, now, 30)).toBe(false);
    expect(isExpired({ startedAt: daysAgo(90), lastAnswerAt: new Date(daysAgo(30).getTime() - 1) }, now, 30)).toBe(
      true,
    );
  });

  it("falls back to the start time when nothing was answered yet", () => {
    expect(isExpired({ startedAt: daysAgo(31), lastAnswerAt: null }, now, 30)).toBe(true);
    expect(isExpired({ startedAt: daysAgo(2), lastAnswerAt: null }, now, 30)).toBe(false);
  });

  it("reads the window from its argument, not a fixed number", () => {
    expect(isExpired({ startedAt: daysAgo(10), lastAnswerAt: null }, now, 7)).toBe(true);
    expect(isExpired({ startedAt: daysAgo(10), lastAnswerAt: null }, now, 14)).toBe(false);
  });
});

describe("isAway (a returning learner, D75)", () => {
  const now = new Date("2026-12-01T12:00:00Z");
  const minutesAgo = (minutes: number) => new Date(now.getTime() - minutes * 60 * 1000);

  it("is away from the window onward, judged from the last answer", () => {
    expect(isAway({ startedAt: minutesAgo(500), lastAnswerAt: minutesAgo(29) }, now, 30)).toBe(false);
    expect(isAway({ startedAt: minutesAgo(500), lastAnswerAt: minutesAgo(30) }, now, 30)).toBe(true);
  });

  it("falls back to the start time while nothing is answered", () => {
    expect(isAway({ startedAt: minutesAgo(60), lastAnswerAt: null }, now, 30)).toBe(true);
    expect(isAway({ startedAt: minutesAgo(1), lastAnswerAt: null }, now, 30)).toBe(false);
  });
});

describe("set 1.1.0: status first, name second, and the Home answer (D87)", () => {
  const next = QUESTION_SET_1_1_0;

  it("asks status, then the name, then age and goal, then the scored items", () => {
    const order = questionOrder(next);
    expect(order.slice(0, 4).map((e) => e.id)).toEqual(["b-status", "b-name", "b-age", "b-goal"]);
    expect(order.slice(0, 4).map((e) => e.kind)).toEqual(["basics", "name", "basics", "basics"]);
    expect(order).toHaveLength(1 + next.basics.length + next.items.length);
  });

  it("puts the name first when the set names no question to follow (1.0.0)", () => {
    expect(questionOrder(QUESTION_SET_1_0_0)[0]).toEqual({ id: "b-name", stage: "basics", kind: "name" });
  });

  it("goes to the name once status is answered", () => {
    const step = computeNextStep(next, { "b-status": 0 }, { attemptId: "a", hasName: false });
    expect(step.kind).toBe("name");
  });

  it("skips the name for a learner who already has one", () => {
    const step = computeNextStep(next, { "b-status": 0 }, { attemptId: "a", hasName: true });
    expect(step.kind === "basics" && step.id).toBe("b-age");
  });

  it("homeAnswer turns an option id into the answer's position", () => {
    const options = next.basics.find((b) => b.id === "b-status")!.options;
    const i = options.findIndex((o) => o.id === "college");
    expect(homeAnswer(next, "college")).toEqual({ questionId: "b-status", value: i });
  });

  it("homeAnswer refuses an unknown option, a non-string, and a set with no home question", () => {
    expect(homeAnswer(next, "astronaut")).toBeNull();
    expect(homeAnswer(next, 2)).toBeNull();
    expect(homeAnswer(next, undefined)).toBeNull();
    expect(homeAnswer(QUESTION_SET_1_0_0, "school")).toBeNull();
  });

  it("homeQuestionView lists the home question's options by id and label (no question id), and is null without one", () => {
    const view = homeQuestionView(next)!;
    const question = next.basics.find((b) => b.id === "b-status")!;
    expect(view).toEqual({
      prompt: question.prompt,
      options: question.options.map((o) => ({ id: o.id, label: o.label })),
    });
    expect(homeQuestionView(QUESTION_SET_1_0_0)).toBeNull();
  });

  it("homeAnsweredView shows the stored option from the given set, with the step that asks it again", () => {
    const question = next.basics.find((b) => b.id === "b-status")!;
    const stored = homeAnswer(next, question.options[1]!.id)!;
    const progress = progressOf(next, { [stored.questionId]: stored.value }, false);
    const view = homeAnsweredView(next, stored.value, progress)!;
    expect(view.prompt).toBe(question.prompt);
    expect(view.label).toBe(question.options[1]!.label);
    expect(view.acknowledgement).toBe(question.options[1]!.acknowledgement);
    // The Change step asks that question again, options by position (what submitAnswer takes).
    expect(view.change).toEqual({
      kind: "basics",
      id: question.id,
      prompt: question.prompt,
      options: question.options.map((o, index) => ({ index, label: o.label })),
      progress,
    });
    expect(homeAnsweredView(next, 99, progress)).toBeNull();
    expect(homeAnsweredView(QUESTION_SET_1_0_0, 0, progress)).toBeNull();
  });
});
