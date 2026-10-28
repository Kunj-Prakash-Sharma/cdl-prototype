# Spec: Auth (phone OTP login + roles)

- **Status:** draft (certain parts filled; items marked **TBD** are for the evening interview)
- **Owner:** Vijay
- **Related decisions:** D43 (Better Auth), D54 (Turnstile + rate limits), D57 (sms wrapper), D46, D18, Age rule

## Goal
A learner logs in with a phone number and an SMS code. The client team logs in the same way with an admin role. Other modules ask "who is logged in?" through three helpers and never touch Better Auth.

## Scope
- Phone number + OTP login, session cookie, logout.
- Roles: `learner` (default), `admin`.
- Learner profile fields: phone, name, optional email, role, consent flags, created date.
- Invisible Turnstile bot check on OTP send; rate limits (per number per day, per IP per hour, resend cooldown).
- Guards: `(learner)` pages need a session, `(admin)` pages need the admin role.
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
  - `service.ts` (public): `getSession(): Promise<Session | null>`, `requireUser(): Promise<Session>`, `requireAdmin(): Promise<Session>`.
  - `actions.ts`: `sendOtp(phone, captchaToken)`, `verifyOtp(phone, code)`, `logout()`; zod-validated, thin.
- **Integration used:** `src/integrations/sms` (`sendOtp(phone, code)`), `src/integrations/analytics` (`track`).
- **Schema:** see above. PII: phone, name, email.
- **Env:** `AUTH_SECRET`, `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` added to `src/lib/env-schema.ts` and `.env.example`. `SMS_PROVIDER` stays `fake` locally.
- **Routes:** `/login` (phone), `/login/verify` (code); route-group guards for `(learner)` and `(admin)`. If Better Auth needs a catch-all handler, `src/app/api/auth/[...all]/route.ts`.
- **UI:** phone input + code input, mobile first, tokens only, 375px + desktop. Reuse `src/components/ui`.
- **Read first:** Better Auth docs (phone-number, admin, captcha plugins) and `node_modules/next/dist/docs/` (Next 16.4 cookies/proxy). Do not write from memory.

## Rules and invariants that apply
- No phone, name or email in logs or analytics events.
- Only `modules/auth` imports Better Auth.
- Modules talk through `service.ts` only.
- `pickAdapter` already refuses `fake` SMS in production; keep that.
- Mark PII columns in schema comments.

## Decisions needed (TBD tonight)
| # | Question | Suggested default |
|---|---|---|
| 1 | Country codes | India +91 only |
| 2 | Login required where | Start chat + buy; course pages and free lesson open |
| 3 | Session length | 30 days |
| 4 | Returning user | See saved report; chat redo allowed? |
| 5 | OTP rules | 6 digits, 5 min expiry, 5 tries, lock 15 min |
| 6 | Limits | Resend wait 30 s, 5 codes/number/day, 10/IP/hour |
| 7 | Bot check fails | "Try again" message |
| 8 | Profile edits | Name editable; phone change needs new OTP; email optional |
| 9 | Admins | Allow-list of phone numbers set by us; how many? |
| 10 | Terms tick at login | Yes once legal pages exist |
| 11 | SMS registration late | Fixed test code for allow-listed invited numbers (temporary) |
| 12 | Data deletion | Manual in Phase 1 |

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
