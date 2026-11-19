// PUBLIC interface of modules/chat. Other modules and pages import only this file (never repo.ts, schema.ts, actions.ts).
// Functions take the learner (from auth's requireUser(), done by the caller) and never throw for expected cases:
// they return `{ ok: true, ... }` or `{ ok: false, code }`. Every function that takes an attempt id checks that the
// attempt belongs to that learner, and answers "not_found" otherwise (the same answer for "missing" and "not yours",
// so ids cannot be probed). The question set comes from the attempt's own `set_version`, never from a fixed list.
import {
  acknowledgementFor,
  checkAnswer,
  completedStage,
  computeNextStep,
  firstUnanswered,
  isAway,
  isExpired,
  progressOf,
  questionOrder,
  isReachable,
  stageQuestionIds,
} from "./flow";
import { CURRENT_QUESTION_SET, getQuestionSet, type QuestionSet, type Stage } from "./question-set";
import { secondsBetween, trackChat } from "./events";
import { linkedGuestIds } from "@/modules/auth/service";
import { coursesForInterests, type CourseSuggestion } from "@/modules/catalog/service";
import { reportFor, type ReportView } from "./report";
import { SAMPLE_REPORT } from "./sample-report";
import { toResultRow, toResultView, type ResultView } from "./result";
import * as repo from "./repo";
import { scoreAttempt, scoreOcean, scoreRiasec, type StageProblem } from "./scoring";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { validateName } from "./name-check";
import type { ChatResult, Learner, NextStep } from "./types";
import { variantFor } from "./variants";

export type { ResultView } from "./result";
export type { ReportView } from "./report";
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

/**
 * Guests who verified a phone and became this learner hand their quiz over here (D80): the attempts are re-pointed to
 * the real user (the same rows, so answers and results carry over; the newest quiz wins). Lazy and idempotent: called at
 * the top of every entry point that reads a learner's attempts, so it works whether they verified at the report gate
 * or on /login, and a second call changes nothing. For a plain learner or a guest it finds no linked guests.
 */
export async function claimLinkedGuests(userId: string): Promise<number> {
  let moved = 0;
  for (const guestId of await linkedGuestIds(userId)) {
    const count = await repo.claimGuestAttempts(guestId, userId);
    if (count > 0) trackChat(guestId, "guest_claimed", { attempts: count });
    moved += count;
  }
  return moved;
}

/**
 * The learner's open attempt if it can still be continued. One that went `CHAT_RESUME_DAYS` without an answer has
 * expired (D75): it is closed here, when it is read, so no background job is needed, and the caller sees "none".
 */
async function findLiveAttempt(userId: string): Promise<repo.AttemptRow | undefined> {
  const attempt = await repo.findOpenAttempt(userId);
  if (!attempt) return undefined;
  if (!isExpired(attempt, new Date(), env.CHAT_RESUME_DAYS)) return attempt;
  await repo.setAttemptStatus(attempt.id, "in_progress", "abandoned");
  return undefined;
}

/** Resumes the learner's open attempt, or starts one. `resumed` says which. */
export async function startOrResumeAttempt(
  learner: Learner,
): Promise<ChatResult<{ attemptId: string; resumed: boolean; next: NextStep }>> {
  await claimLinkedGuests(learner.userId);
  let attempt = await findLiveAttempt(learner.userId);
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
  if (!resumed) trackChat(attempt.id, "chat_started", {});
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
  const res = await startOrResumeAttempt(learner);
  if (res.ok && !res.resumed) trackChat(res.attemptId, "chat_retake", {});
  return res;
}

/** Does the learner have an unfinished attempt that can still be continued? (Never creates one.) */
export async function hasOpenAttempt(userId: string): Promise<boolean> {
  await claimLinkedGuests(userId);
  return (await findLiveAttempt(userId)) !== undefined;
}

export type ResumeOffer = { kind: "none" } | { kind: "offer"; attemptId: string; answered: number; total: number };

/**
 * E4-S12: should the learner be asked "Continue or start again"? Only for a returning learner: a live open attempt
 * with an answer, untouched for `CHAT_INACTIVITY_MINUTES`. A quick refresh mid-quiz, or an empty attempt, simply
 * resumes. Read-only (an expired attempt is closed, nothing is created).
 */
export async function getResumeOffer(learner: Learner): Promise<ResumeOffer> {
  await claimLinkedGuests(learner.userId);
  const attempt = await findLiveAttempt(learner.userId);
  const set = attempt && getQuestionSet(attempt.setVersion);
  if (!attempt || !set) return { kind: "none" };
  if (!isAway(attempt, new Date(), env.CHAT_INACTIVITY_MINUTES)) return { kind: "none" };
  const answers = await repo.listAnswers(attempt.id);
  if (Object.keys(answers).length === 0) return { kind: "none" };
  const { answered, total } = progressOf(set, answers, hasName(learner));
  return { kind: "offer", attemptId: attempt.id, answered, total };
}

/**
 * "Start again" on the welcome-back screen: ends THAT attempt for good (its answers stay, it is never resumed) and
 * starts a new one. The screen names the attempt it was showing, so a stale tab cannot end a different one: if the
 * attempt is already closed the answer is `attempt_closed` and the page reloads to the truth.
 */
export async function restartAttempt(learner: Learner, attemptId: string) {
  const loaded = await loadOwned(learner, attemptId);
  if (loaded === null || loaded === "unknown_set") return failed(loaded);
  if (loaded.attempt.status !== "in_progress") return { ok: false, code: "attempt_closed" } as const;
  await repo.setAttemptStatus(attemptId, "in_progress", "abandoned");
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

/** Saves one answer (a second tap overwrites it) and returns what comes next plus Mira's short reply. */
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

  const checked = checkAnswer(set, questionId, value);
  if (!checked.ok) return { ok: false, code: "invalid_input" };

  const answers = await repo.listAnswers(attemptId);
  if (!isReachable(set, answers, hasName(learner), questionId)) return { ok: false, code: "out_of_order" };

  // Which wording was shown is decided here from the attempt, never trusted from the client.
  const item = set.items.find((i) => i.id === questionId);
  const variantId = item ? variantFor(attemptId, item).id : null;
  const now = new Date();
  await repo.saveAnswer({ attemptId, questionId, variantId, value }, now);

  const updated = { ...answers, [questionId]: value };
  // A second tap on the same question only overwrites: it is not a new step in the funnel.
  if (!Object.hasOwn(answers, questionId)) {
    trackChat(attemptId, "chat_step", {
      stage: checked.stage,
      messageNumber: questionOrder(set).findIndex((entry) => entry.id === questionId) + 1,
      inputType: checked.kind === "basics" ? "single" : "likert",
      secondsTaken: secondsBetween(attempt.lastAnswerAt ?? attempt.startedAt, now),
    });
    const done = completedStage(progressOf(set, answers, hasName(learner)), progressOf(set, updated, hasName(learner)));
    if (done) trackChat(attemptId, "chat_stage_completed", { stage: done, setVersion: set.version });
  }
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
    if (score.status === "invalid")
      trackChat(attemptId, "chat_invalid", { reason: "stage_invalid", stage: score.stage });
    return { ok: false, code: score.status === "invalid" ? "stage_invalid" : "incomplete", stage: score.stage };
  }

  const now = new Date();
  const stored = await repo.completeAttempt(attemptId, toResultRow(attemptId, set, score), now);
  // Another tab finished it first: return what it stored.
  const row = await repo.getResult(attemptId);
  if (!row) return { ok: false, code: "unknown" };
  // Only the request that actually completed it counts (another tab may have won the race).
  if (stored) {
    trackChat(attemptId, "chat_completed", {
      setVersion: set.version,
      hollandClose: row.hollandClose,
      flat: row.flat,
      durationSeconds: secondsBetween(attempt.startedAt, now),
    });
  }
  const finishedAt = stored ? now : ((await repo.getAttempt(attemptId))?.completedAt ?? now);
  return { ok: true, result: toResultView(row, finishedAt) };
}

/** Saves the name on the learner's profile. Injected by the caller (actions pass auth's updateProfileName), so chat never touches auth. */
export type NameSaver = (userId: string, name: string) => Promise<{ ok: boolean }>;

/**
 * The typed name (the only free text, D46). Checked by `validateName`: a bad format or an abuse word asks again; a self-harm
 * phrase ends the
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
    trackChat(attemptId, "chat_invalid", { reason: "name_rejected" });
    if (checked.reason === "blocked") {
      // The learner must reach the stop screen even if closing the attempt fails: log (never the name) and answer.
      try {
        await repo.setAttemptStatus(attemptId, "in_progress", "abandoned");
      } catch (err) {
        logger.error("could not end the attempt after a blocked name", { error: err });
      }
      return { ok: false, code: "name_blocked" };
    }
    // An abuse word (or anything else that is not a name) only asks again: no helpline, the attempt stays open.
    return { ok: false, code: "name_format" };
  }

  const saved = await saveName(learner.userId, checked.value);
  // A failed save is not the learner's typing (validateName already passed): it is ours.
  if (!saved.ok) return { ok: false, code: "unknown" };

  // Another request may have ended the attempt while the name was being saved.
  const current = await repo.getAttempt(attemptId);
  if (!current || current.status !== "in_progress") return { ok: false, code: "attempt_closed" };

  if (!hasName(learner)) {
    trackChat(attemptId, "chat_step", {
      stage: "basics",
      messageNumber: questionOrder(set).findIndex((entry) => entry.id === set.name.id) + 1,
      inputType: "name",
      secondsTaken: secondsBetween(attempt.lastAnswerAt ?? attempt.startedAt, new Date()),
    });
  }
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
  await claimLinkedGuests(userId);
  const latest = await repo.latestCompleted(userId);
  if (!latest || !latest.attempt.completedAt) return null;
  return toResultView(latest.result, latest.attempt.completedAt);
}

/** What the report page shows: the report plus the courses that suit the learner (plain fields, safe for client components). */
export type LatestReport = ReportView & { courses: CourseSuggestion[]; coursesAreFallback: boolean };

/**
 * The report for the learner's newest completed attempt, built with the wording version that result was stamped with.
 * `latest` is null when the learner has no completed attempt yet (the page shows an empty state). The learner can only
 * ever reach their own result: it is looked up by their user id, never by an id from the URL. No side effects: the
 * page fires `trackReportViewed` itself, so other callers (My SELF, callbacks) do not inflate the view count.
 * `attemptId` is for server-side analytics only: do not pass it to client components.
 */
export async function getLatestReport(
  userId: string,
): Promise<ChatResult<{ latest: { report: LatestReport; attemptId: string } | null }>> {
  await claimLinkedGuests(userId);
  const stored = await repo.latestCompleted(userId);
  if (!stored || !stored.attempt.completedAt) return { ok: true, latest: null };
  const built = reportFor(toResultView(stored.result, stored.attempt.completedAt));
  if (!built.ok) {
    logger.error("report wording version is missing", { reportVersion: stored.result.reportVersion });
    return { ok: false, code: "unknown" };
  }
  const { courses, fallback } = coursesForInterests(built.report.hollandLetters);
  return {
    ok: true,
    latest: { report: { ...built.report, courses, coursesAreFallback: fallback }, attemptId: stored.attempt.id },
  };
}

/** What a report page gets: the real report, or (for a guest) the fixed sample behind the phone gate. */
export type VisitorReport =
  | { gated: false; latest: { report: LatestReport; attemptId: string } | null }
  | { gated: true; finished: boolean; sample: LatestReport };

/**
 * The report for whoever is on the page (D78). A VERIFIED learner gets their real report. A GUEST gets only the fixed
 * sample and whether they finished the quiz: their real scores never leave the server, so a blurred screen hides nothing
 * that dev tools could reveal. `finished` is false when the guest has no completed quiz (the page shows "not ready").
 */
export async function getReportForVisitor(visitor: {
  userId: string;
  isGuest: boolean;
}): Promise<ChatResult<VisitorReport>> {
  if (!visitor.isGuest) {
    const real = await getLatestReport(visitor.userId);
    return real.ok ? { ok: true, gated: false, latest: real.latest } : real;
  }
  const stored = await repo.latestCompleted(visitor.userId);
  if (stored) trackChat(stored.attempt.id, "report_gate_shown", {});
  const { courses, fallback } = coursesForInterests(SAMPLE_REPORT.hollandLetters);
  return {
    ok: true,
    gated: true,
    finished: stored !== undefined,
    sample: { ...SAMPLE_REPORT, courses, coursesAreFallback: fallback },
  };
}

/** Funnel event for opening the report. Fire and forget: analytics never fails the page (events.ts). */
export function trackReportViewed(attemptId: string, report: LatestReport): void {
  trackChat(attemptId, "report_viewed", { scoresPresent: true, coursesSuggested: report.courses.length });
}

export const REPORT_ACTIONS = ["save", "pdf", "callback", "courses"] as const;
export type ReportAction = (typeof REPORT_ACTIONS)[number];

/** Funnel event for a button on the report (D18: a fixed code only). A learner without a report records nothing. */
export async function recordReportAction(learner: Learner, action: ReportAction): Promise<ChatResult> {
  const stored = await repo.latestCompleted(learner.userId);
  if (!stored) return { ok: false, code: "not_found" };
  trackChat(stored.attempt.id, "report_action", { action });
  return { ok: true };
}

/**
 * What the team needs to know before a callback: the learner's tap answers about themselves, as the labels the
 * question set shows, and their top interest areas. No name and no phone (those stay in auth). There is no minor
 * flag any more (D79): the age answer is plain information for the team.
 */
export type CallbackContext = {
  attemptId: string;
  age: string | null;
  status: string | null;
  goal: string | null;
  topInterests: string[];
};

const answerLabel = (set: QuestionSet, answers: Record<string, number>, questionId: string) => {
  const question = set.basics.find((basic) => basic.id === questionId);
  const option = question?.options[answers[questionId] ?? -1];
  return { label: option?.label ?? null };
};

/** Builds the context of one completed attempt, or null if its question set or report wording is missing. */
async function contextOf(attempt: repo.AttemptRow, resultRow: repo.ResultRow): Promise<CallbackContext | null> {
  const set = getQuestionSet(attempt.setVersion);
  const built = attempt.completedAt ? reportFor(toResultView(resultRow, attempt.completedAt)) : null;
  if (!set || !built?.ok) return null;
  const answers = await repo.listAnswers(attempt.id);
  const age = answerLabel(set, answers, "b-age");
  return {
    attemptId: attempt.id,
    age: age.label,
    status: answerLabel(set, answers, "b-status").label,
    goal: answerLabel(set, answers, "b-goal").label,
    topInterests: built.report.areas.map((area) => area.name),
  };
}

/** The context of the learner's newest completed attempt (the report they are looking at), or null if there is none. */
export async function getCallbackContext(userId: string): Promise<CallbackContext | null> {
  const latest = await repo.latestCompleted(userId);
  return latest ? contextOf(latest.attempt, latest.result) : null;
}

/**
 * The context of one attempt, for the admin callback list. NO ownership check: only call it after `requireAdmin()`,
 * with an attempt id that came from a lead row (never from the browser).
 */
export async function getCallbackContextForAdmin(attemptId: string): Promise<CallbackContext | null> {
  const attempt = await repo.getAttempt(attemptId);
  if (!attempt || attempt.status !== "completed") return null;
  const result = await repo.getResult(attemptId);
  return result ? contextOf(attempt, result) : null;
}
