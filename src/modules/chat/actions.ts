"use server";

// Server actions for the quiz screens. Thin: zod-validate the input, require a login (requireUser sends a logged-out
// visitor to /login), rate-limit, call the service, return a typed `{ ok, code }`. Expected failures never throw, and
// ownership of the attempt is checked inside the service on every call (a stranger's attempt id gets `not_found`).
import { z } from "zod";
import { logger } from "@/lib/logger";
import { requireUser, updateProfileName } from "@/modules/auth/service";
import { ANSWER_LIMIT_PER_MINUTE, ANSWER_LIMIT_WINDOW_MS, createLimiter } from "./limits";
import * as chat from "./service";
import type { ChatResult, Learner } from "./types";

// performance.now() is monotonic: a clock change on the server cannot lock a learner out or let a flood through.
const answerLimiter = createLimiter(ANSWER_LIMIT_PER_MINUTE, ANSWER_LIMIT_WINDOW_MS);

const attemptSchema = z.object({ attemptId: z.string().uuid() });
const answerSchema = attemptSchema.extend({ questionId: z.string().min(1).max(64), value: z.number() });
// The service enforces the real rules (letters only, 30 characters, blocked words); this only bounds the input size.
const nameSchema = attemptSchema.extend({ name: z.string().max(200) });
const stageSchema = attemptSchema.extend({ stage: z.string().min(1).max(32) });

const invalid = { ok: false, code: "invalid_input" } as const;

async function currentLearner(): Promise<Learner> {
  const session = await requireUser("/discover");
  return { userId: session.userId, name: session.name };
}

/** A crash in the database layer must not leak details to the browser: log it, answer "unknown". */
async function guarded<T extends object>(run: () => Promise<ChatResult<T>>): Promise<ChatResult<T>> {
  try {
    return await run();
  } catch (err) {
    // requireUser redirects by throwing an error Next recognises by its digest; let Next handle only those.
    if (err && typeof err === "object" && "digest" in err && String(err.digest).startsWith("NEXT_")) throw err;
    logger.error("chat action failed", { error: err });
    return { ok: false, code: "unknown" };
  }
}

export async function startAttempt() {
  const learner = await currentLearner();
  return guarded(() => chat.startOrResumeAttempt(learner));
}

/** Retake: a new attempt, or the open one if there is one (no pile of empty attempts). */
export async function retake() {
  const learner = await currentLearner();
  return guarded(() => chat.retake(learner));
}

export async function submitAnswer(input: unknown) {
  const parsed = answerSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const learner = await currentLearner();
  const limit = answerLimiter.hit(learner.userId, performance.now());
  if (!limit.ok) return { ok: false, code: "rate_limited", retryAfterSec: limit.retryAfterSec } as const;
  return guarded(() => chat.submitAnswer(learner, parsed.data.attemptId, parsed.data.questionId, parsed.data.value));
}

/** The one typed answer. A blocked word ends the attempt (`name_blocked`: show the stop screen with the helpline). */
export async function submitName(input: unknown) {
  const parsed = nameSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const learner = await currentLearner();
  const limit = answerLimiter.hit(learner.userId, performance.now());
  if (!limit.ok) return { ok: false, code: "rate_limited", retryAfterSec: limit.retryAfterSec } as const;
  return guarded(() => chat.submitName(learner, parsed.data.attemptId, parsed.data.name, updateProfileName));
}

export async function finishAttempt(input: unknown) {
  const parsed = attemptSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const learner = await currentLearner();
  return guarded(() => chat.finishAttempt(learner, parsed.data.attemptId));
}

export async function retryStage(input: unknown) {
  const parsed = stageSchema.safeParse(input);
  if (!parsed.success) return invalid;
  const learner = await currentLearner();
  return guarded(() => chat.retryStage(learner, parsed.data.attemptId, parsed.data.stage));
}
