// OTP and rate-limit rules (decision D64). One place, so tests and docs match the code.
export const OTP_LENGTH = 6;
export const OTP_EXPIRES_SEC = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const LOCK_SEC = 15 * 60;
export const RESEND_COOLDOWN_SEC = 30;
export const DAILY_CAP = 5; // codes per number per rolling day
export const DAY_SEC = 24 * 60 * 60;
export const IP_HOURLY_CAP = 10; // enforced by Better Auth's rate limiter, see auth.ts
export const SESSION_SEC = 30 * 24 * 60 * 60;

/** Per-number send state. The number itself is never stored, only an HMAC (see repo.ts). */
export type Throttle = {
  lastSentAt: Date | null;
  windowStart: Date | null;
  sendCount: number;
  lockedUntil: Date | null;
};

export const emptyThrottle: Throttle = { lastSentAt: null, windowStart: null, sendCount: 0, lockedUntil: null };

export type SendDecision =
  | { ok: true; next: Throttle }
  | { ok: false; code: "locked" | "cooldown" | "daily_limit"; retryAfterSec: number };

const secondsUntil = (target: Date, now: Date) => Math.max(1, Math.ceil((target.getTime() - now.getTime()) / 1000));

/** Pure rule: may a code be sent to this number now? On ok, `next` is the state to store. */
export function decideSend(state: Throttle | null, now: Date): SendDecision {
  const s = state ?? emptyThrottle;
  if (s.lockedUntil && s.lockedUntil > now) {
    return { ok: false, code: "locked", retryAfterSec: secondsUntil(s.lockedUntil, now) };
  }
  if (s.lastSentAt) {
    const cooldownEnds = new Date(s.lastSentAt.getTime() + RESEND_COOLDOWN_SEC * 1000);
    if (cooldownEnds > now) return { ok: false, code: "cooldown", retryAfterSec: secondsUntil(cooldownEnds, now) };
  }
  const windowEnds = s.windowStart ? new Date(s.windowStart.getTime() + DAY_SEC * 1000) : null;
  const windowOpen = windowEnds !== null && windowEnds > now;
  const count = windowOpen ? s.sendCount : 0;
  if (count >= DAILY_CAP && windowEnds) {
    return { ok: false, code: "daily_limit", retryAfterSec: secondsUntil(windowEnds, now) };
  }
  return {
    ok: true,
    next: {
      lastSentAt: now,
      windowStart: windowOpen ? s.windowStart : now,
      sendCount: count + 1,
      lockedUntil: null,
    },
  };
}

/** After too many wrong codes: lock the number for LOCK_SEC. */
export function applyLock(state: Throttle | null, now: Date): Throttle {
  return { ...(state ?? emptyThrottle), lockedUntil: new Date(now.getTime() + LOCK_SEC * 1000) };
}
