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
  ({ ok: true } & T) | { ok: false; code: AuthErrorCode; retryAfterSec?: number };

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

/** One row of the admin users list. Phone is masked; the raw number never leaves the auth module. */
export type AdminUserRow = {
  id: string;
  phoneMasked: string;
  name: string; // empty until the learner gives it in the chat
  role: Role;
  joinedAt: string; // ISO date
};

export type AdminUsersView = {
  rows: AdminUserRow[];
  total: number; // matching the filters
  page: number;
  pageCount: number;
  stats: { total: number; admins: number; named: number; newThisWeek: number };
};
