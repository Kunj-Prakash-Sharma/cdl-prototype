// Safe to import from client components: types and constants only, no server code.

/** The UI owns all wording. Codes are the contract (docs/specs/auth.md, "UI contract"). */
export const AUTH_ERROR_CODES = [
  "invalid_input",
  "invalid_phone",
  "captcha_failed",
  "cooldown",
  "daily_limit",
  "ip_limit",
  "send_failed",
  "bad_code",
  "expired",
  "locked",
  "unauthorized",
  "forbidden",
  "unknown",
] as const;
export type AuthErrorCode = (typeof AUTH_ERROR_CODES)[number];

export type ActionResult<T extends object = object> =
  | ({ ok: true } & T)
  | { ok: false; code: AuthErrorCode; retryAfterSec?: number };

export type Role = "learner" | "admin";

/** Plain and serialisable. Never carries the raw phone number. */
export type SessionView = {
  userId: string;
  role: Role;
  name: string; // empty until the learner gives it in the chat
  phoneMasked: string;
};

export type SendOtpOk = { resendAfterSec: number; expiresInSec: number };
export type VerifyOtpOk = { isNewUser: boolean; next: string };
