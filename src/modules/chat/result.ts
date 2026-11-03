// PURE: turns a score into a database row and back. No database, no clock.
import type { QuestionSet, RiasecDimension } from "./question-set";
import type { Holland, OceanScores, RiasecScores, ScoreResult } from "./scoring";
import type { NewResultRow, ResultRow } from "./repo";

/** What the rest of the app gets: plain and serialisable. */
export type ResultView = {
  attemptId: string;
  setVersion: string;
  ocean: OceanScores;
  riasec: RiasecScores;
  holland: Holland;
  completedAt: string; // ISO date
};

type OkScore = Extract<ScoreResult, { status: "ok" }>;

/** Row for a successful score. `stage_status` has one entry per stage, so a new stage needs no new column. */
export function toResultRow(attemptId: string, set: QuestionSet, score: OkScore): NewResultRow {
  const flat = "flat" in score.holland;
  return {
    attemptId,
    setVersion: set.version,
    scores: { ocean: score.ocean, riasec: score.riasec },
    holland: "letters" in score.holland ? score.holland.letters.join("") : null,
    hollandClose: "letters" in score.holland ? score.holland.close : false,
    flat,
    stageStatus: Object.fromEntries(
      [...new Set(set.items.map((item) => item.stage))].map((stage) => [stage, "ok" as const]),
    ),
  };
}

export function toResultView(row: ResultRow, completedAt: Date): ResultView {
  const scores = row.scores as { ocean: OceanScores; riasec: RiasecScores };
  const holland: Holland =
    row.holland && !row.flat
      ? { letters: row.holland.split("") as RiasecDimension[], close: row.hollandClose }
      : { flat: true };
  return {
    attemptId: row.attemptId,
    setVersion: row.setVersion,
    ocean: scores.ocean,
    riasec: scores.riasec,
    holland,
    completedAt: completedAt.toISOString(),
  };
}
