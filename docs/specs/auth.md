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

## Guest accounts (D78, D80, Nov 16, not built yet)
- Better Auth `anonymous` plugin, inside `modules/auth` only. A guest user is made when the visitor taps Start (bot check and D74 limits apply), never on page load. Kept 7 days; a pg-boss job deletes older anonymous users and their unfinished attempts.
- On phone-OTP success the plugin's `onLinkAccount` runs BEFORE it deletes the guest: it re-points the guest's `chat_attempts` and the pending name to the real user in one transaction (idempotent). If the number already has a report, the newest quiz wins.
- `requireUser()` refuses anonymous users (leads, buying, paid video). `requireLearnerOrGuest()` is for the chat only. Admin user lists hide anonymous users.
- Free lecture previews make no account (anonymous analytics id only, D66).

## Out of scope
- Email/password or social login (B2B, later).
- Real SMS adapter (MSG91): added when DLT registration is done; separate small PR.
- Admin screens (users, courses): later feature. Here only the role + guard.
- Marketing consent, WhatsApp OTP.

## Files and interfaces
- **Module:** `src/modules/auth/`
  - `schema.ts`: Better Auth tables (user, session, account, verification, rate limit if DB-backed) with PII columns commented.
  - `auth.ts` (private): Better Auth config: phone-number plugin (sends via `sms.sendOtp`), admin plugin, captcha plugin (Turnstile).
  - `service.ts` (public): `getSession(): Promise<Session | null>`, `requireUser(): Promise<Session>`, `requireAdmin(): Promise<Session>`, `updateProfileName(userId, name): Promise<ActionResult>` (used by chat after its own name check, which owns the blocked-word list; auth only enforces 1 to 30 characters).
  - `actions.ts`: `sendOtp(phone, captchaToken)`, `verifyOtp(phone, code)`, `logout()`; zod-validated, thin.
- **Integration used:** `src/integrations/sms` (`sendOtp(phone, code)`), `src/integrations/analytics` (`track`).
- **Schema:** see above. PII: phone, name, email.
- **Env:** `AUTH_SECRET`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (added Oct 28; required in production). To add with this feature: `ADMIN_PHONES` (comma list of +91 numbers) and, for the temporary invite-code fallback, `INVITE_OTP_CODE` + `INVITE_PHONES`. `SMS_PROVIDER` stays `fake` locally.
- **Routes:** `/login` (phone), `/login/verify` (code) are built by the UI team against the UI contract below. Guards: `src/proxy.ts` (optimistic cookie redirect for `/discover`, `/my-self`, `/admin`) plus `requireUser()` in `app/(learner)/layout.tsx` (real check). Admin: `requireAdmin()` in `app/(admin)/layout.tsx`, and again inside `listUsersForAdmin` (service) so the data call is guarded on its own. **No `/api/auth/*` catch-all is mounted**: all calls go through our actions, so Better Auth exposes no public HTTP surface.
- **UI:** phone input + code input, mobile first, tokens only, 375px + desktop. Reuse `src/components/ui`.
- **Read first:** Better Auth docs (phone-number, admin, captcha plugins) and `node_modules/next/dist/docs/` (Next 16.4 cookies/proxy). Do not write from memory.

## How it is wired (decided while building, Oct 28)
- Better Auth's captcha check and per-IP rate limit run **only in its HTTP router**, not on direct `auth.api.*` calls. So `sendOtp` calls `auth.handler(Request)` (bot check and IP limit apply); `verifyOtp` and `getSession` use `auth.api.*`.
- Per-number rules (30 s cooldown, 5 per day, 15-minute lock) are ours: table `auth_otp_throttle`, keyed by an HMAC of the number. A read-only pre-check runs first (so a rejected resend never replaces the learner's current code); the authoritative check-and-record runs inside the send hook, after the bot check (so a bot without a valid token cannot burn a victim's daily cap).
- Wrong codes: Better Auth allows 5 tries per code; we count them and lock the number for 15 minutes on the 5th wrong try.
- The built-in `email` column holds a placeholder (`<phone>@phone.invalid`); the optional real email is `contactEmail`.
- Per-IP limit is 10 per hour in production and 100 elsewhere (so dev and Playwright logins from one IP keep working).
- **Device limit and SMS spend cutoff (D74, Nov 6):** device = random id in an httpOnly cookie `device_id` (kept only as an HMAC), checked in `sendOtp` after the per-number pre-check: 10 codes per device per day in production, 100 elsewhere. The spend cutoff is one shared counter (`SMS_DAILY_CAP` per rolling 24 hours, default 5000 in production) checked inside the send hook, after the bot check and before the per-number record. Both live in `auth_otp_throttle` under the keys `dev:<hmac>` and `sms:total`. A device limit does not stop a bot that drops cookies; the IP limit, Turnstile and the cutoff do.
- **Deploy note:** behind the AWS load balancer, set `advanced.ipAddress.trustedProxies` so a client cannot spoof `x-forwarded-for` and dodge the IP limit.

## UI contract (so the frontend can change without backend rework)
- Actions never throw for expected cases. They return `{ ok: true, ... }` or `{ ok: false, code, retryAfterSec? }`.
- Codes (fixed list, exported as a type from `modules/auth`): `invalid_phone`, `captcha_failed`, `cooldown`, `daily_limit`, `ip_limit`, `device_limit`, `sms_cutoff`, `send_failed`, `bad_code`, `expired`, `locked`, `unauthorized`, `forbidden`. The UI owns all wording.
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
| 1 | Country codes | India +91 only. *Nov 2, 2026 (D65): login will also accept an email with the same OTP method; needs its own spec, not built yet* |
| 2 | Login required | *Nov 16 (D78): NOT before the chat any more; the quiz is open to guests and the phone OTP gates the report.* Before buying, and for **paid video playback**. *Nov 2, 2026 (D66): free lecture previews need no login (this replaces the earlier "free first lesson needs login"; preview analytics use an anonymous session id).* Home page and course detail pages stay open |
| 3 | Session length | 30 days |
| 4 | Returning user | Sees the saved report; can retake (new attempt, old report stays until the new one completes) |
| 5 | OTP rules | 6 digits, 5 min expiry, 5 tries, then locked 15 min |
| 6 | Limits | Resend wait 30 s, 5 codes per number per day, 10 per IP per hour. *Nov 6 (D74): IP limit raised to 60 per hour (shared mobile and campus IPs); plus 10 per device per day and a total SMS cutoff per day* |
| 7 | Bot check fails | "Try again" message; no SMS sent |
| 8 | Profile edits | Name editable (same check as chat); phone change needs a new OTP; email optional |
| 9 | Admins | Allow-list of phone numbers set by us (`ADMIN_PHONES`); count to be fixed with the client (expect 2 to 4) |
| 10 | Terms tick | Yes, once the client's legal pages exist; no tick shown until then |
| 11 | SMS registration late | Temporary fixed code for allow-listed invited numbers only. Needs its own guard (explicit env flag and number list), separate from `pickAdapter`. Must be removed before public launch |
| 12 | Data deletion | Manual in Phase 1; document the steps |

## Admin login with email + password (E3-S6, D77)
A second way into `/admin` for the client team. Phone-OTP admins (`ADMIN_PHONES`) keep working: this is an addition, not a replacement. The client still has to confirm which method they want for admins.
- **Accounts:** created ONLY by `npm run admin:create -- <email>` (no public sign-up: Better Auth `emailAndPassword.disableSignUp`). The script makes the user with role `admin`, an empty name and a **random 24-character password it prints once** (never stored in clear, never logged). `--reset` sets a new random password for an existing email-admin (the only way to reset: no email sending yet). It refuses an email that belongs to a phone account (`.invalid` placeholder emails) or to an existing non-admin. Email addresses are lowercased.
- **Screen:** `/admin/login` (email, password, Turnstile) with a link "Log in with a phone number instead" to `/login?next=/admin`. It sits OUTSIDE the `(admin)` route group (that layout requires an admin, so the login page would redirect to itself) and is excluded from the `proxy.ts` matcher.
- **Guards:** a logged-out visitor to `/admin/*` is sent to `/admin/login?next=...` (proxy and `requireAdmin`). A logged-in learner is still sent home. `requireAdmin()` stays the real check.
- **Action `adminSignIn`:** zod input; look up the lock for this email (HMAC key `admin:<email>`, reuses `auth_otp_throttle`: 5 wrong passwords lock it for 15 minutes, same as OTP; the wrong-password count restarts when a lock starts and after every successful login, so one typo after a lock never locks again); call Better Auth through `auth.handler` so the Turnstile check and the per-IP limit (10 per minute in production) run; map failures to codes. **One code, `bad_credentials`, for an unknown email and a wrong password** (no account enumeration; Better Auth hashes a dummy password for unknown emails, so timing matches). The lock counts attempts for ANY email, known or not, so "locked" says nothing about whether an account exists. After a successful sign-in the role must be `admin`, otherwise that user's sessions are deleted (by user id, in the database) and the answer is `bad_credentials`.
- **Codes added:** `bad_credentials`. Reused: `invalid_input`, `captcha_failed`, `ip_limit`, `locked`, `unknown`.
- **No PII in logs or events:** the email is never logged; failures log the code only.
- **Not built:** forgot-password and change-password screens, email verification, 2FA.
- **Tests:** unit (code mapping), integration (script function: creates an admin who can sign in, refuses duplicates and phone placeholders, reset works, old password stops working; action: wrong password and unknown email look identical, lock after 5 failures, learner role refused), e2e (admin logs in with email + password, wrong password message, logged-out `/admin` goes to `/admin/login`, no redirect loop).

## Edge cases
- Wrong code repeated: lock after N tries. Expired code: ask to resend.
- Resend inside cooldown, or over daily cap: reject with a clear message, no SMS sent.
- Missing/invalid Turnstile token: reject, no SMS sent.
- SMS provider throws: show a generic error, log without the phone number.
- Two tabs / double submit: only the latest code is valid.
- Non-admin opens `/admin`: denied. Logged-out opens learner page: redirect to `/login`, return after login.

## Verification (end to end)
- Unit tests: guards (`requireUser`, `requireAdmin`), rate-limit and attempt-lock rules, phone validation.
- Manual: `docker compose up -d`, `npm run db:migrate`, `npm run dev`. Send code (terminal shows masked number and code), verify, land on `/discover` (the default after login; `?next=` overrides it). Logout, open `/my-self`: redirected to login.
- Abuse: wrong code past limit locks; fast resend rejected; no Turnstile token rejected.
- Playwright login path at 375px and desktop (`npm run test:e2e`).
- `npm run lint && npm run typecheck && npm run test`, then `/code-review` and `/security-review`.
- Events: `otp_sent` (result), `otp_verified` (result, attempt number); no PII.
