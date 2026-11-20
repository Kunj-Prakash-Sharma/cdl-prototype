// OCEAN and RIASEC scoring. A PURE function of question IDs and answer values (D62: no AI, no randomness, no clock).
// It imports only the question-set data and types: nothing from db, env or time. The rules are
// docs/requirements/assessment.md section 6; the worked examples F1 to F4 there are the test fixtures.
// Thresholds come from the set's config (they need client sign-off), never from constants in this file.
//
// The input is a map of question ID to value 1 to 5. Anything that is not a scored item of the set (the basics, unknown
// keys) is ignored, and a value that is not an integer from 1 to 5 counts as "not answered": the service rejects such
// values on the way in, so this is only a second line of defence. The wording variant that was shown never matters.
import {
  OCEAN_DIMENSIONS,
  RIASEC_DIMENSIONS,
  type Item,
  type OceanDimension,
  type QuestionSet,
  type RiasecDimension,
  type Stage,
  type Thresholds,
} from "./question-set";

export type Answers = Readonly<Record<string, number>>;

export type OceanBand = "lower" | "middle" | "higher";
export type OceanScores = Record<OceanDimension, { score: number; band: OceanBand }>;
export type RiasecScores = Record<RiasecDimension, number>;
/** The top three types in rank order, shown as a close group when `close`; or no code at all when the profile is flat. */
export type Holland = { letters: RiasecDimension[]; close: boolean } | { flat: true };

/** A stage that cannot be scored. It blocks the report for that stage (assessment.md section 6, rules 3 and 4). */
export type StageProblem = { status: "incomplete" | "invalid"; stage: Stage };

export type OceanOutcome = { status: "ok"; scores: OceanScores } | StageProblem;
export type RiasecOutcome = { status: "ok"; scores: RiasecScores; holland: Holland } | StageProblem;

export type ScoreResult = { status: "ok"; ocean: OceanScores; riasec: RiasecScores; holland: Holland } | StageProblem;

const isScaleValue = (value: unknown): value is number =>
  Number.isInteger(value) && (value as number) >= 1 && (value as number) <= 5;

/** Reverse-keyed ("-") items count as 6 minus the value (rule 1). */
const keyed = (item: Item, value: number) => (item.key === "-" ? 6 - value : value);

/**
 * Rule 2: score = round((mean - 1) / 4 * 100), halves rounded up (12.5 gives 13). `sum` and `count` are of the keyed
 * values, and the arithmetic is on integers so there is no floating-point surprise at the halves.
 */
function dimensionScore(sum: number, count: number): number {
  const numerator = (sum - count) * 100; // (mean - 1) * count * 100
  const denominator = 4 * count; //            4 * count
  return Math.floor((2 * numerator + denominator) / (2 * denominator));
}

/** Rule 5: `<= oceanLow` is lower, `>= oceanHigh` is higher, anything between is middle. */
export function bandFor(score: number, thresholds: Pick<Thresholds, "oceanLow" | "oceanHigh">): OceanBand {
  if (score <= thresholds.oceanLow) return "lower";
  if (score >= thresholds.oceanHigh) return "higher";
  return "middle";
}

type StageData<D extends string> = { scores: Record<D, number> };

/**
 * Shared per-stage work: pick the answered items, enforce the minimum (rule 3) and the straight-lining check (rule 4),
 * then compute one score per dimension. Returns the problem, or the scores.
 */
function scoreStage<D extends OceanDimension | RiasecDimension>(
  stage: Stage,
  dimensions: readonly D[],
  answers: Answers,
  set: QuestionSet,
): StageProblem | StageData<D> {
  const items = set.items.filter((item) => item.stage === stage);
  const answered = items
    .map((item) => ({ item, value: answers[item.id] }))
    .filter((entry): entry is { item: Item; value: number } => isScaleValue(entry.value));

  // Rule 3: at least minAnsweredPct of the stage's items, and at least one answered item in every dimension.
  const enough = answered.length * 100 >= set.thresholds.minAnsweredPct * items.length;
  const everyDimensionCovered = dimensions.every((d) => answered.some((a) => a.item.dimension === d));
  if (!enough || !everyDimensionCovered) return { status: "incomplete", stage };

  // Rule 4: every answered item has the same raw value, whatever its key.
  if (answered.every((a) => a.value === answered[0]!.value)) return { status: "invalid", stage };

  const scores = {} as Record<D, number>;
  for (const d of dimensions) {
    const mine = answered.filter((a) => a.item.dimension === d);
    const sum = mine.reduce((total, a) => total + keyed(a.item, a.value), 0);
    scores[d] = dimensionScore(sum, mine.length);
  }
  return { scores };
}

export function scoreOcean(answers: Answers, set: QuestionSet): OceanOutcome {
  const stage = scoreStage("ocean", OCEAN_DIMENSIONS, answers, set);
  if ("status" in stage) return stage;
  const scores = {} as OceanScores;
  for (const d of OCEAN_DIMENSIONS) {
    scores[d] = { score: stage.scores[d], band: bandFor(stage.scores[d], set.thresholds) };
  }
  return { status: "ok", scores };
}

export function scoreRiasec(answers: Answers, set: QuestionSet): RiasecOutcome {
  const stage = scoreStage("riasec", RIASEC_DIMENSIONS, answers, set);
  if ("status" in stage) return stage;
  const scores = stage.scores;
  const values = RIASEC_DIMENSIONS.map((d) => scores[d]);

  // Rule 8: no clear lead. Checked first, because a flat profile has no meaningful ranking.
  if (Math.max(...values) - Math.min(...values) <= set.thresholds.closeSpread) {
    return { status: "ok", scores, holland: { flat: true } };
  }

  // Rule 6: rank high to low; ties break in the fixed order R, I, A, S, E, C (the order of RIASEC_DIMENSIONS).
  const ranked = [...RIASEC_DIMENSIONS].sort(
    (a, b) => scores[b] - scores[a] || RIASEC_DIMENSIONS.indexOf(a) - RIASEC_DIMENSIONS.indexOf(b),
  );
  const top = ranked.slice(0, 3);
  // Rule 7: the top three are within about one answer step of each other, so show them as a group.
  const close = scores[top[0]!] - scores[top[2]!] <= set.thresholds.closeSpread;
  return { status: "ok", scores, holland: { letters: top, close } };
}

/**
 * Scores a whole attempt. OCEAN is checked first, then RIASEC; the first stage that cannot be scored is reported, so
 * the learner is only asked to redo that part. Use `scoreOcean` / `scoreRiasec` to get each stage on its own.
 */
export function scoreAttempt(answers: Answers, set: QuestionSet): ScoreResult {
  const ocean = scoreOcean(answers, set);
  if (ocean.status !== "ok") return ocean;
  const riasec = scoreRiasec(answers, set);
  if (riasec.status !== "ok") return riasec;
  return { status: "ok", ocean: ocean.scores, riasec: riasec.scores, holland: riasec.holland };
}
