// OTP and rate-limit rules (decision D64). One place, so tests and docs match the code.
export const OTP_LENGTH = 6;
export const OTP_EXPIRES_SEC = 5 * 60;
export const OTP_MAX_ATTEMPTS = 5;
export const LOCK_SEC = 15 * 60;
export const RESEND_COOLDOWN_SEC = 30;
export const DAILY_CAP = 5; // codes per number per rolling day
export const DAY_SEC = 24 * 60 * 60;
// Per IP per hour, enforced by Better Auth's rate limiter (see auth.ts). 60, not 10 (D74): phones on one mobile carrier and
// colleges or offices on one Wi-Fi share an IP, and real learners must not be blocked on launch day.
export const IP_HOURLY_CAP = 60;
export const SESSION_SEC = 30 * 24 * 60 * 60;
// D74. Codes per browser (cookie) per day, and total SMS codes per rolling day. Loose outside production so dev and
// Playwright logins from one machine keep working (same idea as the IP limit).
export const DEVICE_DAILY_CAP = 10;
export const DEVICE_DAILY_CAP_LOOSE = 100;
export const SMS_DAILY_CAP_DEFAULT = 5000; // launch to about 8k invited subscribers: sized for a busy first day
export const SMS_DAILY_CAP_LOOSE = 1_000_000;

export const deviceDailyCap = (nodeEnv: string) =>
  nodeEnv === "production" ? DEVICE_DAILY_CAP : DEVICE_DAILY_CAP_LOOSE;
/** An explicit SMS_DAILY_CAP always wins; otherwise the cap is real in production and practically off elsewhere. */
export const smsDailyCap = (nodeEnv: string, configured?: number) =>
  configured ?? (nodeEnv === "production" ? SMS_DAILY_CAP_DEFAULT : SMS_DAILY_CAP_LOOSE);

/** Per-number send state. The number itself is never stored, only an HMAC (see repo.ts). */
export type Throttle = {
  lastSentAt: Date | null;
  windowStart: Date | null;
  sendCount: number;
  lockedUntil: Date | null;
};

export const emptyThrottle: Throttle = { lastSentAt: null, windowStart: null, sendCount: 0, lockedUntil: null };

export type SendDecision =
  { ok: true; next: Throttle } | { ok: false; code: "locked" | "cooldown" | "daily_limit"; retryAfterSec: number };

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

export type WindowDecision = { ok: true; next: Throttle } | { ok: false; retryAfterSec: number };

/**
 * Pure rule for a plain "at most `cap` per rolling day" counter (the device limit and the SMS spend cutoff). The day
 * starts at the first count; once `cap` is reached nothing more is counted until the day window ends.
 */
export function decideWindow(state: Throttle | null, now: Date, cap: number): WindowDecision {
  const s = state ?? emptyThrottle;
  const windowEnds = s.windowStart ? new Date(s.windowStart.getTime() + DAY_SEC * 1000) : null;
  const windowOpen = windowEnds !== null && windowEnds > now;
  const count = windowOpen ? s.sendCount : 0;
  if (count >= cap && windowEnds) return { ok: false, retryAfterSec: secondsUntil(windowEnds, now) };
  return {
    ok: true,
    next: { ...s, lastSentAt: now, windowStart: windowOpen ? s.windowStart : now, sendCount: count + 1 },
  };
}

/** After too many wrong codes: lock the number for LOCK_SEC. */
export function applyLock(state: Throttle | null, now: Date): Throttle {
  return { ...(state ?? emptyThrottle), lockedUntil: new Date(now.getTime() + LOCK_SEC * 1000) };
}
