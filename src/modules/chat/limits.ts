// Chat rate limit (spec: "simple per-minute cap" on answers). One place, so tests and docs match the code.
export const ANSWER_LIMIT_PER_MINUTE = 60; // the quiz has about 26 taps; a person cannot honestly send 60 in a minute
export const ANSWER_LIMIT_WINDOW_MS = 60_000;

export { createLimiter, type LimitDecision } from "@/lib/limiter";
