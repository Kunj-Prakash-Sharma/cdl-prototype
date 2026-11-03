// PURE flow logic: given a question set and the answers saved so far, what comes next? No database, no clock, no
// randomness. The service feeds it rows from the database; tests feed it plain objects.
//
// The order of questions is the order in the set: the name, the basics, then the scored items. "Where am I?" is never
// stored as a counter: it is recomputed as the first question without a saved answer.
import type { QuestionSet, Stage } from "./question-set";
import { fnv1a, variantFor } from "./variants";
import type { NextStep, Progress, StageId, StageProgress } from "./types";

/** Saved answers by question ID (name excluded: it lives on the profile). */
export type SavedAnswers = Readonly<Record<string, number>>;

export type OrderEntry = { id: string; stage: StageId; kind: "name" | "basics" | "question" };

/** Every question in the order it is asked. */
export function questionOrder(set: QuestionSet): OrderEntry[] {
  return [
    { id: set.name.id, stage: "basics", kind: "name" },
    ...set.basics.map((b): OrderEntry => ({ id: b.id, stage: "basics", kind: "basics" })),
    ...set.items.map((item): OrderEntry => ({ id: item.id, stage: item.stage, kind: "question" })),
  ];
}

/** Stage order as it appears in the set: basics first, then each stage in the order its items first appear. */
export function stageOrder(set: QuestionSet): StageId[] {
  return [...new Set<StageId>(questionOrder(set).map((entry) => entry.stage))];
}

const isAnswered = (entry: OrderEntry, answers: SavedAnswers, hasName: boolean) =>
  entry.kind === "name" ? hasName : Object.hasOwn(answers, entry.id);

export function progressOf(set: QuestionSet, answers: SavedAnswers, hasName: boolean): Progress {
  const order = questionOrder(set);
  const stages: StageProgress[] = stageOrder(set).map((id) => {
    const entries = order.filter((entry) => entry.stage === id);
    return {
      id,
      answered: entries.filter((entry) => isAnswered(entry, answers, hasName)).length,
      total: entries.length,
    };
  });
  return {
    answered: stages.reduce((sum, stage) => sum + stage.answered, 0),
    total: order.length,
    stages,
  };
}

/** The first question without an answer, or null when everything is answered. */
export function firstUnanswered(set: QuestionSet, answers: SavedAnswers, hasName: boolean): OrderEntry | null {
  return questionOrder(set).find((entry) => !isAnswered(entry, answers, hasName)) ?? null;
}

/** What the learner should see now. `attemptId` picks the wording, so a refresh shows the same text. */
export function computeNextStep(
  set: QuestionSet,
  answers: SavedAnswers,
  context: { attemptId: string; hasName: boolean },
): NextStep {
  const progress = progressOf(set, answers, context.hasName);
  const entry = firstUnanswered(set, answers, context.hasName);
  if (!entry) return { kind: "done", progress };

  if (entry.kind === "name") return { kind: "name", id: entry.id, prompt: set.name.prompt, progress };

  if (entry.kind === "basics") {
    const basic = set.basics.find((b) => b.id === entry.id)!;
    return {
      kind: "basics",
      id: basic.id,
      prompt: basic.prompt,
      options: basic.options.map((option, index) => ({ index, label: option.label })),
      progress,
    };
  }

  const item = set.items.find((i) => i.id === entry.id)!;
  const variant = variantFor(context.attemptId, item);
  const scale = set.scales[item.stage];
  return {
    kind: "question",
    id: item.id,
    stage: item.stage,
    variantId: variant.id,
    text: variant.text,
    scale: { prompt: scale.prompt, labels: scale.labels },
    progress,
  };
}

export type AnswerCheck = { ok: true; kind: "basics" | "question"; stage: StageId } | { ok: false };

/** Is `value` a legal answer to `questionId`? Basics take an option position; scored items take an integer 1 to 5. */
export function checkAnswer(set: QuestionSet, questionId: string, value: unknown): AnswerCheck {
  if (typeof value !== "number" || !Number.isInteger(value)) return { ok: false };
  const basic = set.basics.find((b) => b.id === questionId);
  if (basic)
    return value >= 0 && value < basic.options.length ? { ok: true, kind: "basics", stage: "basics" } : { ok: false };
  const item = set.items.find((i) => i.id === questionId);
  if (item) return value >= 1 && value <= 5 ? { ok: true, kind: "question", stage: item.stage } : { ok: false };
  return { ok: false };
}

/**
 * May this question be answered now? Only the current question or an earlier one (answering an earlier one again
 * overwrites it, which is what "back" needs). A question that is not reached yet is out of order.
 */
export function isReachable(set: QuestionSet, answers: SavedAnswers, hasName: boolean, questionId: string): boolean {
  const order = questionOrder(set);
  const current = firstUnanswered(set, answers, hasName);
  if (!current) return order.some((entry) => entry.id === questionId);
  const limit = order.findIndex((entry) => entry.id === current.id);
  const target = order.findIndex((entry) => entry.id === questionId);
  return target !== -1 && target <= limit;
}

/** Meera's short line after an answer: the chosen option's reply for basics, a rotating generic line for the rest. */
export function acknowledgementFor(set: QuestionSet, attemptId: string, questionId: string, value: number): string {
  const basic = set.basics.find((b) => b.id === questionId);
  if (basic) return basic.options[value]?.acknowledgement ?? "";
  if (set.acknowledgements.length === 0) return "";
  return set.acknowledgements[fnv1a(`${attemptId}\u0000${questionId}`) % set.acknowledgements.length]!;
}

/** The scored questions of one stage (what to clear when that stage is asked again). */
export function stageQuestionIds(set: QuestionSet, stage: Stage): string[] {
  return set.items.filter((item) => item.stage === stage).map((item) => item.id);
}
