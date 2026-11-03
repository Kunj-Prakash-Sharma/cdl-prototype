// PUBLIC interface of modules/chat. Other modules and pages import only this file (never repo.ts, schema.ts, actions.ts).
// Functions take the learner (from auth's requireUser(), done by the caller) and never throw for expected cases:
// they return `{ ok: true, ... }` or `{ ok: false, code }`. Every function that takes an attempt id checks that the
// attempt belongs to that learner, and answers "not_found" otherwise (the same answer for "missing" and "not yours",
// so ids cannot be probed). The question set comes from the attempt's own `set_version`, never from a fixed list.
import {
  acknowledgementFor,
  checkAnswer,
  computeNextStep,
  firstUnanswered,
  isReachable,
  stageQuestionIds,
} from "./flow";
import { CURRENT_QUESTION_SET, getQuestionSet, type QuestionSet, type Stage } from "./question-set";
import { toResultRow, toResultView, type ResultView } from "./result";
import * as repo from "./repo";
import { scoreAttempt, scoreOcean, scoreRiasec, type StageProblem } from "./scoring";
import { logger } from "@/lib/logger";
import { validateName } from "./name-check";
import type { ChatResult, Learner, NextStep } from "./types";
import { variantFor } from "./variants";

export type { ResultView } from "./result";
export type {
  ChatErrorCode,
  ChatResult,
  Learner,
  NextStep,
  Progress,
  ScaleView,
  StageId,
  StageProgress,
} from "./types";
export { CHAT_ERROR_CODES } from "./types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const hasName = (learner: Learner) => learner.name.trim() !== "";

type Owned = { attempt: repo.AttemptRow; set: QuestionSet };

/** The attempt, if it exists and belongs to this learner, with the question set it was given. */
async function loadOwned(learner: Learner, attemptId: string): Promise<Owned | null | "unknown_set"> {
  if (!UUID.test(attemptId)) return null;
  const attempt = await repo.getAttempt(attemptId);
  if (!attempt || attempt.userId !== learner.userId) return null;
  const set = getQuestionSet(attempt.setVersion);
  return set ? { attempt, set } : "unknown_set";
}

const failed = (loaded: null | "unknown_set") =>
  ({ ok: false, code: loaded === null ? "not_found" : "unknown" }) as const;

/** Resumes the learner's open attempt, or starts one. `resumed` says which. */
export async function startOrResumeAttempt(
  learner: Learner,
): Promise<ChatResult<{ attemptId: string; resumed: boolean; next: NextStep }>> {
  let attempt = await repo.findOpenAttempt(learner.userId);
  let resumed = true;
  if (!attempt) {
    resumed = false;
    // Two tabs can race: the database lets exactly one insert win, and the loser reads the winner's attempt.
    attempt = (await repo.createAttemptIfNone(learner.userId, CURRENT_QUESTION_SET.version)) ?? undefined;
    if (!attempt) {
      resumed = true;
      attempt = await repo.findOpenAttempt(learner.userId);
    }
  }
  if (!attempt) return { ok: false, code: "unknown" };
  const set = getQuestionSet(attempt.setVersion);
  if (!set) return { ok: false, code: "unknown" };
  const answers = await repo.listAnswers(attempt.id);
  return {
    ok: true,
    attemptId: attempt.id,
    resumed,
    next: computeNextStep(set, answers, { attemptId: attempt.id, hasName: hasName(learner) }),
  };
}

/**
 * "Take it again": a new attempt, unless the learner still has an unfinished one, which is resumed instead (so
 * tapping Retake repeatedly cannot pile up empty attempts). Old attempts and their reports are kept.
 */
export async function retake(learner: Learner) {
  return startOrResumeAttempt(learner);
}

/** Where the learner is: the first question without an answer, recomputed from the saved answers every time. */
export async function getNextStep(learner: Learner, attemptId: string): Promise<ChatResult<{ next: NextStep }>> {
  const loaded = await loadOwned(learner, attemptId);
  if (loaded === null || loaded === "unknown_set") return failed(loaded);
  if (loaded.attempt.status === "abandoned") return { ok: false, code: "attempt_closed" };
  const answers = await repo.listAnswers(attemptId);
  return {
    ok: true,
    next: computeNextStep(loaded.set, answers, { attemptId, hasName: hasName(learner) }),
  };
}

/** Saves one answer (a second tap overwrites it) and returns what comes next plus Meera's short reply. */
export async function submitAnswer(
  learner: Learner,
  attemptId: string,
  questionId: string,
  value: number,
): Promise<ChatResult<{ next: NextStep; acknowledgement: string }>> {
  const loaded = await loadOwned(learner, attemptId);
  if (loaded === null || loaded === "unknown_set") return failed(loaded);
  const { attempt, set } = loaded;
  if (attempt.status !== "in_progress") return { ok: false, code: "attempt_closed" };

  if (!checkAnswer(set, questionId, value).ok) return { ok: false, code: "invalid_input" };

  const answers = await repo.listAnswers(attemptId);
  if (!isReachable(set, answers, hasName(learner), questionId)) return { ok: false, code: "out_of_order" };

  // Which wording was shown is decided here from the attempt, never trusted from the client.
  const item = set.items.find((i) => i.id === questionId);
  const variantId = item ? variantFor(attemptId, item).id : null;
  await repo.saveAnswer({ attemptId, questionId, variantId, value }, new Date());

  const updated = { ...answers, [questionId]: value };
  return {
    ok: true,
    next: computeNextStep(set, updated, { attemptId, hasName: hasName(learner) }),
    acknowledgement: acknowledgementFor(set, attemptId, questionId, value),
  };
}

/**
 * Scores the attempt with ITS OWN question set and stores the result. Idempotent: finishing a finished attempt
 * returns the stored result. A stage with all-same answers returns `stage_invalid` (the attempt stays open so
 * that stage can be asked again); too few answers return `incomplete`.
 */
export async function finishAttempt(learner: Learner, attemptId: string): Promise<ChatResult<{ result: ResultView }>> {
  const loaded = await loadOwned(learner, attemptId);
  if (loaded === null || loaded === "unknown_set") return failed(loaded);
  const { attempt, set } = loaded;

  if (attempt.status === "completed") {
    const stored = await repo.getResult(attemptId);
    return stored && attempt.completedAt
      ? { ok: true, result: toResultView(stored, attempt.completedAt) }
      : { ok: false, code: "unknown" };
  }
  if (attempt.status !== "in_progress") return { ok: false, code: "attempt_closed" };

  const answers = await repo.listAnswers(attemptId);
  if (firstUnanswered(set, answers, hasName(learner))) return { ok: false, code: "incomplete" };

  const score = scoreAttempt(answers, set);
  if (score.status !== "ok") {
    return { ok: false, code: score.status === "invalid" ? "stage_invalid" : "incomplete", stage: score.stage };
  }

  const now = new Date();
  const stored = await repo.completeAttempt(attemptId, toResultRow(attemptId, set, score), now);
  // Another tab finished it first: return what it stored.
  const row = await repo.getResult(attemptId);
  if (!row) return { ok: false, code: "unknown" };
  const finishedAt = stored ? now : ((await repo.getAttempt(attemptId))?.completedAt ?? now);
  return { ok: true, result: toResultView(row, finishedAt) };
}

/** Saves the name on the learner's profile. Injected by the caller (actions pass auth's updateProfileName), so chat never touches auth. */
export type NameSaver = (userId: string, name: string) => Promise<{ ok: boolean }>;

/**
 * The typed name (the only free text, D46). Checked by `validateName`: a bad format asks again; a blocked word ends the
 * attempt for good (nothing saved, the caller shows the stop screen with the helpline); a good name is saved on the
 * profile through `saveName`, never in a chat table.
 */
export async function submitName(
  learner: Learner,
  attemptId: string,
  rawName: string,
  saveName: NameSaver,
): Promise<ChatResult<{ next: NextStep }>> {
  const loaded = await loadOwned(learner, attemptId);
  if (loaded === null || loaded === "unknown_set") return failed(loaded);
  const { attempt, set } = loaded;
  if (attempt.status !== "in_progress") return { ok: false, code: "attempt_closed" };

  const checked = validateName(rawName);
  if (!checked.ok) {
    if (checked.reason === "blocked") {
      // The learner must reach the stop screen even if closing the attempt fails: log (never the name) and answer.
      try {
        await repo.setAttemptStatus(attemptId, "in_progress", "abandoned");
      } catch (err) {
        logger.error("could not end the attempt after a blocked name", { error: err });
      }
      return { ok: false, code: "name_blocked" };
    }
    return { ok: false, code: "name_format" };
  }

  const saved = await saveName(learner.userId, checked.value);
  // A failed save is not the learner's typing (validateName already passed): it is ours.
  if (!saved.ok) return { ok: false, code: "unknown" };

  // Another request may have ended the attempt while the name was being saved.
  const current = await repo.getAttempt(attemptId);
  if (!current || current.status !== "in_progress") return { ok: false, code: "attempt_closed" };

  const answers = await repo.listAnswers(attemptId);
  return { ok: true, next: computeNextStep(set, answers, { attemptId, hasName: true }) };
}

const SCORERS: Record<Stage, (answers: Record<string, number>, set: QuestionSet) => { status: string } | StageProblem> =
  {
    ocean: scoreOcean,
    riasec: scoreRiasec,
  };

/** After `stage_invalid`: clears that stage's answers (and only that stage's) so it can be asked again. */
export async function retryStage(
  learner: Learner,
  attemptId: string,
  stage: string,
): Promise<ChatResult<{ next: NextStep }>> {
  const loaded = await loadOwned(learner, attemptId);
  if (loaded === null || loaded === "unknown_set") return failed(loaded);
  const { attempt, set } = loaded;
  if (attempt.status !== "in_progress") return { ok: false, code: "attempt_closed" };
  if (!Object.hasOwn(SCORERS, stage) || !set.items.some((item) => item.stage === stage)) {
    return { ok: false, code: "invalid_input" };
  }

  const answers = await repo.listAnswers(attemptId);
  // Only a stage that really scored "invalid" may be cleared: this is not a way to erase answers at will.
  if (SCORERS[stage as Stage](answers, set).status !== "invalid") return { ok: false, code: "not_allowed" };

  await repo.deleteAnswers(attemptId, stageQuestionIds(set, stage as Stage));
  const remaining = await repo.listAnswers(attemptId);
  return { ok: true, next: computeNextStep(set, remaining, { attemptId, hasName: hasName(learner) }) };
}

/** Ends an attempt for good (for example a blocked name). It is not resumed; the next start creates a new one. */
export async function abandonAttempt(learner: Learner, attemptId: string): Promise<ChatResult> {
  const loaded = await loadOwned(learner, attemptId);
  if (loaded === null || loaded === "unknown_set") return failed(loaded);
  if (loaded.attempt.status !== "in_progress") return { ok: false, code: "attempt_closed" };
  await repo.setAttemptStatus(attemptId, "in_progress", "abandoned");
  return { ok: true };
}

/** The result of the learner's newest completed attempt, or null. */
export async function getLatestResult(userId: string): Promise<ResultView | null> {
  const latest = await repo.latestCompleted(userId);
  if (!latest || !latest.attempt.completedAt) return null;
  return toResultView(latest.result, latest.attempt.completedAt);
}
