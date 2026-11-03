// Chat rate limit (spec: "simple per-minute cap" on answers). One place, so tests and docs match the code.
export const ANSWER_LIMIT_PER_MINUTE = 60; // the quiz has about 26 taps; a person cannot honestly send 60 in a minute
export const ANSWER_LIMIT_WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 10_000; // memory bound: keys with no recent hits are dropped first, then the oldest key

export type LimitDecision = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Sliding-window limiter, pure apart from the clock you pass in. Per process: with several app instances the real cap
 * is the limit times the number of instances, which is fine for stopping a scripted flood (not for billing).
 */
export function createLimiter(max: number, windowMs: number, maxKeys = MAX_TRACKED_KEYS) {
  const hits = new Map<string, number[]>();

  function prune(nowMs: number) {
    for (const [key, times] of hits) {
      const recent = times.filter((t) => nowMs - t < windowMs);
      if (recent.length === 0) hits.delete(key);
      else hits.set(key, recent);
    }
  }

  return {
    /** Counts one request for `key` at `nowMs`; refuses when `max` requests already happened inside the window. */
    hit(key: string, nowMs: number): LimitDecision {
      if (hits.size >= maxKeys && !hits.has(key)) {
        prune(nowMs);
        // Still full of active keys: drop the oldest-inserted one, so memory stays bounded (that learner's count restarts).
        if (hits.size >= maxKeys) hits.delete(hits.keys().next().value!);
      }
      const recent = (hits.get(key) ?? []).filter((t) => nowMs - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0]! + windowMs - nowMs) / 1000)) };
      }
      recent.push(nowMs);
      hits.set(key, recent);
      return { ok: true };
    },
    /** For tests. */
    size: () => hits.size,
  };
}
