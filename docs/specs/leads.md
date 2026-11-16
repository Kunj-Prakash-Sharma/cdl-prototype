# Spec: Callback requests and leads (E6)

- **Status:** implemented except the CRM webhook (E6-S6, out of scope for now). Written after the build, 2026-11-06
- **Owner:** team
- **Related decisions:** D79 (replaces D71), D73, D64, D18. Report: [report.md](report.md)

## Goal
A learner asks the team to call from the report. The team is emailed once, sees every request in the admin panel, changes its status and downloads the list.

## Scope
- Callback form on the report: number from the account (not retyped), required consent tick, optional preferred time (morning, afternoon, evening), confirmation message.
- `leads` table: user, attempt, phone snapshot (PII), contact role, preferred time, consent time and consent-text version, status `new | contacted | closed`, `alerted_at`.
- Team email through a pg-boss job (`leads.callback_alert`), once per new lead.
- **Alert sweep (D76):** a scheduled job `leads.alert_sweep` (every 5 minutes) re-queues the alert for any lead with `alerted_at` empty that is at least 5 minutes old and at most 3 days old (oldest first, 50 per run), with the lead id as the singleton key. The alert job itself skips a lead that is already alerted, so running it twice never sends two emails. It covers a failed queueing at request time and an alert job that ran out of retries.
- `/admin/callbacks`: newest first, status tabs, paging, change status, **Download CSV**.

## Out of scope
CRM webhook (E6-S6), Turnstile on the form (login stands in), audit log (E1-S5), `.xlsx` (CSV opens in Excel).

## Rules and invariants (D71, D73)
- A callback needs a finished report (`no_report`).
- At most ONE `new` lead per learner (partial unique index). A repeat tap returns the same lead (`created: false`). After the team marks it `contacted` or `closed`, a new request is allowed. Moving a lead back to `new` is refused (`conflict`) while the learner has another new one.
- **D79 (Nov 16): no minor flow.** Contact role comes from one `contactRole()` function that always returns "learner"; the age answer is not used and the `minor` flag is removed from leads, the team email, admin and CSV. One consent wording. *To change in code: the old age-derived role and parent wording (D71) are removed.*
- A guest (anonymous user, D80) cannot create a lead: `requireUser()` refuses anonymous users.
- Consent wording is versioned (`leads/consent-copy.ts`, DRAFT, lawyer review open).
- 5 requests per hour per learner (per app instance).
- Phone is a snapshot on the lead; the NAME is read live from the profile and never copied. The learner never gets the phone back.
- Every admin function takes the session and refuses non-admins even if the page guard fails.
- **PII map:** `leads.phone`, admin list, CSV, team email (phone, who to ask for, preferred time, age band, top interests, NO name). Never in logs or analytics events; logs carry the lead id only.
- CSV: UTF-8 with BOM, IST dates, phone as `91 98765 43210` (text-safe), cells starting `= + - @` get a leading quote, 2000 rows max.

## Edge cases
- Email fails or `CALLBACK_ALERT_EMAIL` is missing: the job throws and is retried; the lead is still saved. Alerts only go out while `npm run worker` runs. If the retries run out, the sweep queues it again within 5 minutes, for up to 3 days (after that the lead is still in the admin list, but no more emails are tried).
- Queueing fails when the request is saved: the learner still gets the confirmation; the sweep picks the lead up.
- Two tabs, double tap: one lead, one email.
- Learner without a phone on the account: typed error, nothing saved.

## Verification
- Unit: CSV (BOM, formula guard, phone text), admin filters, consent wording guard.
- Integration (`leads/service.int.test.ts`): one new lead per learner, role from age, rate limit, status rules, admin role check on every function, alert job once, no name in the email, the sweep (only unalerted leads inside the 5 minute to 3 day window, one bad enqueue does not stop the rest).
- E2E (`tests/e2e/report.spec.ts`, `callbacks-admin.spec.ts`): parent and adult wording, consent needed, repeat tap keeps one lead, admin sees, changes status, CSV downloads.
- Commands: `npm run lint && npm run typecheck && npm run test && npm run test:int && npm run test:e2e`.
