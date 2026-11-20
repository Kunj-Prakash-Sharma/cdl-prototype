// Pure mapping from Better Auth responses to our UI contract codes (types.ts). No Better Auth import here.
import type { AuthErrorCode } from "./types";

// Codes our own send hook raises (auth.ts)
export const THROTTLED = "OTP_THROTTLED";
export const SEND_FAILED = "OTP_SEND_FAILED";

export type Failure = { code: AuthErrorCode; retryAfterSec?: number };
type Body = { code?: string; message?: string } | null | undefined;

const CAPTCHA_CODES = new Set(["VERIFICATION_FAILED", "MISSING_RESPONSE", "UNKNOWN_ERROR"]);

/** The send hook encodes a throttle as message `cooldown:23`, `daily_limit:3600` or `locked:900`. */
function parseThrottle(message: string | undefined): Failure {
  const [kind, secs] = (message ?? "").split(":");
  const retryAfterSec = Number(secs);
  const code = kind === "locked" || kind === "cooldown" || kind === "daily_limit" ? kind : "unknown";
  return Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? { code, retryAfterSec } : { code };
}

/** A failed call to send-otp (through auth.handler). */
export function mapSendFailure(status: number, body: Body, retryAfterHeader?: string | null): Failure {
  if (body?.code === THROTTLED) return parseThrottle(body.message);
  if (body?.code === SEND_FAILED) return { code: "send_failed" };
  if (body?.code && CAPTCHA_CODES.has(body.code)) return { code: "captcha_failed" };
  if (body?.code === "INVALID_PHONE_NUMBER") return { code: "invalid_phone" };
  if (status === 429) {
    const retryAfterSec = Number(retryAfterHeader);
    return Number.isFinite(retryAfterSec) && retryAfterSec > 0
      ? { code: "ip_limit", retryAfterSec }
      : { code: "ip_limit" };
  }
  return { code: "unknown" };
}

/** A failed call to verify. */
export function mapVerifyFailure(body: Body): Failure {
  switch (body?.code) {
    case "INVALID_OTP":
      return { code: "bad_code" };
    case "OTP_EXPIRED":
    case "OTP_NOT_FOUND":
      return { code: "expired" };
    case "TOO_MANY_ATTEMPTS":
      return { code: "locked" };
    case "INVALID_PHONE_NUMBER":
      return { code: "invalid_phone" };
    default:
      return { code: "unknown" };
  }
}
