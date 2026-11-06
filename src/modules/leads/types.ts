// Safe to import from client components: types and constants only, no server code.
// Codes are the contract; the UI owns all wording (same idea as auth's and chat's error codes).
export const LEAD_ERROR_CODES = [
  "invalid_input", // preferred time is not one of the fixed choices
  "consent_required", // the consent tick was not given
  "no_report", // the learner has no completed report to ask a callback about
  "no_phone", // the account has no phone number to call (for example an email-only login later, D65)
  "rate_limited", // too many requests in an hour (see retryAfterSec)
  "not_found", // no such lead
  "forbidden", // the caller is not an admin
  "conflict", // moving a lead back to new while the same learner already has another new one
  "unknown", // anything unexpected
] as const;
export type LeadErrorCode = (typeof LEAD_ERROR_CODES)[number];

export type LeadResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; code: LeadErrorCode; retryAfterSec?: number };

export const LEAD_STATUSES = ["new", "contacted", "closed"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const PREFERRED_TIMES = ["morning", "afternoon", "evening"] as const;
export type PreferredTime = (typeof PREFERRED_TIMES)[number];
export type ContactRole = "learner" | "parent";

/** What the learner gets back: no phone, no ids of anyone else. */
export type LeadView = {
  id: string;
  status: LeadStatus;
  contactRole: ContactRole;
  preferredTime: PreferredTime | null;
  createdAt: string; // ISO date
};
