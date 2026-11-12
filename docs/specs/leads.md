# Spec: Callback requests and leads (E6)

- **Status:** implemented except the CRM webhook (E6-S6, out of scope for now). Written after the build, 2026-11-06
- **Owner:** team
- **Related decisions:** D71, D73, D64, D18. Report: [report.md](report.md)

## Goal
A learner (or a parent for a learner under 18) asks the team to call from the report. The team is emailed once, sees every request in the admin panel, changes its status and downloads the list.

## Scope
- Callback form on the report: number from the account (not retyped), required consent tick, optional preferred time (morning, afternoon, evening), confirmation message.
- `leads` table: user, attempt, phone snapshot (PII), contact role, preferred time, consent time and consent-text version, status `new | contacted | closed`, `alerted_at`.
- Team email through a pg-boss job (`leads.callback_alert`), once per new lead.
- `/admin/callbacks`: newest first, status tabs, paging, change status, **Download CSV**.

## Out of scope
CRM webhook (E6-S6), Turnstile on the form (login stands in), a sweep that re-queues leads with no `alerted_at`, audit log (E1-S5), `.xlsx` (CSV opens in Excel).

## Rules and invariants (D71, D73)
- A callback needs a finished report (`no_report`).
- At most ONE `new` lead per learner (partial unique index). A repeat tap returns the same lead (`created: false`). After the team marks it `contacted` or `closed`, a new request is allowed. Moving a lead back to `new` is refused (`conflict`) while the learner has another new one.
- Contact role is DERIVED from the age answer (`minor` flag on `under-15`, `15-17`), never asked. Under 18: a parent logs in with their own number; the verified OTP is the consent evidence.
- Consent wording is versioned (`leads/consent-copy.ts`, DRAFT, lawyer review open).
- 5 requests per hour per learner (per app instance).
- Phone is a snapshot on the lead; the NAME is read live from the profile and never copied. The learner never gets the phone back.
- Every admin function takes the session and refuses non-admins even if the page guard fails.
- **PII map:** `leads.phone`, admin list, CSV, team email (phone, who to ask for, preferred time, age band, top interests, NO name). Never in logs or analytics events; logs carry the lead id only.
- CSV: UTF-8 with BOM, IST dates, phone as `91 98765 43210` (text-safe), cells starting `= + - @` get a leading quote, 2000 rows max.

## Edge cases
- Email fails or `CALLBACK_ALERT_EMAIL` is missing: the job throws and is retried; the lead is still saved. Alerts only go out while `npm run worker` runs.
- Two tabs, double tap: one lead, one email.
- Learner without a phone on the account: typed error, nothing saved.

## Verification
- Unit: CSV (BOM, formula guard, phone text), admin filters, consent wording guard.
- Integration (`leads/service.int.test.ts`): one new lead per learner, role from age, rate limit, status rules, admin role check on every function, alert job once, no name in the email.
- E2E (`tests/e2e/report.spec.ts`, `callbacks-admin.spec.ts`): parent and adult wording, consent needed, repeat tap keeps one lead, admin sees, changes status, CSV downloads.
- Commands: `npm run lint && npm run typecheck && npm run test && npm run test:int && npm run test:e2e`.
