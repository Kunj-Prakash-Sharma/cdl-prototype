# Spec: Auth (phone OTP login + roles)

- **Status:** decisions closed Oct 28, 2026 (D64); ready to build
- **Owner:** Vijay
- **Related decisions:** D43 (Better Auth), D54 (Turnstile + rate limits), D57 (sms wrapper), D46, D18, Age rule, **D64 (auth rules)**

## Goal
A learner logs in with a phone number and an SMS code. The client team logs in the same way with an admin role. Other modules ask "who is logged in?" through three helpers and never touch Better Auth.

## Scope
- Phone number + OTP login, session cookie, logout.
- Roles: `learner` (default), `admin`.
- Learner profile fields: phone, name, optional email, role, consent flags, created date.
- Invisible Turnstile bot check on OTP send; rate limits (per number per day, per IP per hour, resend cooldown).
- Guards: `(learner)` pages need a session, `(admin)` pages need the admin role. Video playback checks the session first (the `catalog` module calls `requireUser()`), then entitlements.
- Funnel events `otp_sent`, `otp_verified`.
- SMS via `@/integrations/sms` (`fake` in dev, prints a masked number).

## Out of scope
- Email/password or social login (B2B, later).
- Real SMS adapter (MSG91): added when DLT registration is done; separate small PR.
- Admin screens (users, courses): later feature. Here only the role + guard.
- Marketing consent, WhatsApp OTP.

## Files and interfaces
- **Module:** `src/modules/auth/`
  - `schema.ts`: Better Auth tables (user, session, account, verification, rate limit if DB-backed) with PII columns commented.
  - `auth.ts` (private): Better Auth config: phone-number plugin (sends via `sms.sendOtp`), admin plugin, captcha plugin (Turnstile).
  - `service.ts` (public): `getSession(): Promise<Session | null>`, `requireUser(): Promise<Session>`, `requireAdmin(): Promise<Session>`, `updateProfileName(userId, name): Promise<void>` (used by chat; validates with the chat name check rules, no auth tables touched by chat).
  - `actions.ts`: `sendOtp(phone, captchaToken)`, `verifyOtp(phone, code)`, `logout()`; zod-validated, thin.
- **Integration used:** `src/integrations/sms` (`sendOtp(phone, code)`), `src/integrations/analytics` (`track`).
- **Schema:** see above. PII: phone, name, email.
- **Env:** `AUTH_SECRET`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (added Oct 28; required in production). To add with this feature: `ADMIN_PHONES` (comma list of +91 numbers) and, for the temporary invite-code fallback, `INVITE_OTP_CODE` + `INVITE_PHONES`. `SMS_PROVIDER` stays `fake` locally.
- **Routes:** `/login` (phone), `/login/verify` (code); route-group guards for `(learner)` and `(admin)`. If Better Auth needs a catch-all handler, `src/app/api/auth/[...all]/route.ts`.
- **UI:** phone input + code input, mobile first, tokens only, 375px + desktop. Reuse `src/components/ui`.
- **Read first:** Better Auth docs (phone-number, admin, captcha plugins) and `node_modules/next/dist/docs/` (Next 16.4 cookies/proxy). Do not write from memory.

## UI contract (so the frontend can change without backend rework)
- Actions never throw for expected cases. They return `{ ok: true, ... }` or `{ ok: false, code, retryAfterSec? }`.
- Codes (fixed list, exported as a type from `modules/auth`): `invalid_phone`, `captcha_failed`, `cooldown`, `daily_limit`, `ip_limit`, `send_failed`, `bad_code`, `expired`, `locked`, `unauthorized`, `forbidden`. The UI owns all wording.
- `sendOtp` ok result: `{ ok: true, resendAfterSec, expiresInSec }`. `verifyOtp` ok result: `{ ok: true, isNewUser, next }`, where `next` is the safe return path.
- Guards redirect to `/login?next=<path>`; `next` must be a same-site relative path (reject anything else).
- `getSession()` returns a plain serialisable object (`{ userId, role, name, phoneMasked }`), never the raw phone.
- Test-only: fake SMS prints the code in the terminal; a Playwright helper reads it.

## Rules and invariants that apply
- No phone, name or email in logs or analytics events.
- Only `modules/auth` imports Better Auth.
- Modules talk through `service.ts` only.
- `pickAdapter` already refuses `fake` SMS in production; keep that.
- Mark PII columns in schema comments.

## Decisions (closed Oct 28, 2026; recorded as D64)
| # | Topic | Decision |
|---|---|---|
| 1 | Country codes | India +91 only |
| 2 | Login required | Before starting the chat, before buying, and for **any video playback, including the free first lesson** (the free lesson only skips payment; login lets us see where each viewer stops and resumes). Home page and course detail pages stay open |
| 3 | Session length | 30 days |
| 4 | Returning user | Sees the saved report; can retake (new attempt, old report stays until the new one completes) |
| 5 | OTP rules | 6 digits, 5 min expiry, 5 tries, then locked 15 min |
| 6 | Limits | Resend wait 30 s, 5 codes per number per day, 10 per IP per hour |
| 7 | Bot check fails | "Try again" message; no SMS sent |
| 8 | Profile edits | Name editable (same check as chat); phone change needs a new OTP; email optional |
| 9 | Admins | Allow-list of phone numbers set by us (`ADMIN_PHONES`); count to be fixed with the client (expect 2 to 4) |
| 10 | Terms tick | Yes, once the client's legal pages exist; no tick shown until then |
| 11 | SMS registration late | Temporary fixed code for allow-listed invited numbers only. Needs its own guard (explicit env flag and number list), separate from `pickAdapter`. Must be removed before public launch |
| 12 | Data deletion | Manual in Phase 1; document the steps |

## Edge cases
- Wrong code repeated: lock after N tries. Expired code: ask to resend.
- Resend inside cooldown, or over daily cap: reject with a clear message, no SMS sent.
- Missing/invalid Turnstile token: reject, no SMS sent.
- SMS provider throws: show a generic error, log without the phone number.
- Two tabs / double submit: only the latest code is valid.
- Non-admin opens `/admin`: denied. Logged-out opens learner page: redirect to `/login`, return after login.

## Verification (end to end)
- Unit tests: guards (`requireUser`, `requireAdmin`), rate-limit and attempt-lock rules, phone validation.
- Manual: `docker compose up -d`, `npm run db:migrate`, `npm run dev`. Send code (terminal shows masked number and code), verify, reach `/my-self`. Logout, reach `/my-self` again: redirected.
- Abuse: wrong code past limit locks; fast resend rejected; no Turnstile token rejected.
- Playwright login path at 375px and desktop (`npm run test:e2e`).
- `npm run lint && npm run typecheck && npm run test`, then `/code-review` and `/security-review`.
- Events: `otp_sent` (result), `otp_verified` (result, attempt number); no PII.
