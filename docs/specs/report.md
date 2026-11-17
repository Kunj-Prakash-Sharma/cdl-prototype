# Spec: Free career report (E5)

- **Status:** implemented (temporary screens, DRAFT wording; written after the build, 2026-11-06)
- **Owner:** team
- **Related decisions:** D62, D63, D68, D69, D72, D18, D64. Chat spec: [chat.md](chat.md). Callbacks: [leads.md](leads.md)

## Goal
A logged-in learner who finished the chat reads a free report built only from their saved scores, can save it as a PDF, find it again later (navbar and My SELF) and ask the team for a callback from it.

## Scope
- `/discover/report` (server page, owner only). The finishing screen of the chat opens it by itself (E4-S11).
- Content: Holland code and six interest scores (bars), the five personality cards (a strength-or-balance note and a tip for every band), "Try this first" (lowest-scoring trait), career FAMILIES (not jobs, no salary, no fit %), suggested courses, helpline link, footer line, callback form.
- Wording is versioned data (`chat/report-copy.ts`), stamped on the result when the quiz finishes (`chat_results.report_version`), so an old report keeps its old wording.
- Print stylesheet + "Save as PDF" button (browser print; no PDF library, D48).
- My SELF shows a small card: "Open my report", or "Start the questions" if there is none (E5-S4).

## Gate (D78, built)
A guest sees a fixed sample report behind a phone-OTP gate; the real report loads only after verification. Details in [chat.md](chat.md).

## Out of scope
Aptitude, work values, fit %, salary (D72). Client-approved wording and career list. A "how we score" page. Real course mapping (E7, ticket #4665). Final design.

## Files and interfaces
- `modules/chat/report.ts` (pure): `buildReport(result, copy)`, `reportFor(result)` returns `{ ok, report }`.
- `modules/chat/service.ts`: `getLatestReport(userId)` (no side effects), `trackReportViewed`, `recordReportAction`. Action: `trackReportAction`.
- `modules/chat/careers.ts` (ours, unapproved), `modules/catalog/service.ts`: `coursesForInterests(letters)` (temporary mapping on sample courses, `riasecTypes`).
- Schema: `chat_results.report_version` (default `1.0.0-draft`), migration 0002.
- UI: `src/components/report/*`, `src/app/(learner)/discover/report/page.tsx`, print rules in `globals.css`.

## Rules and invariants
- Report is read by the learner's user id, never an id from the URL (a stranger cannot reach it).
- Tie rules: interest ties R, I, A, S, E, C; "Try this first" ties O, C, E, A, N.
- No PII in events. `attemptId` stays server-side. Courses carry only slug, title, tagline.
- DRAFT wording shows a visible "Draft wording" tag; `report-copy.test.ts` "still the draft wording" fails on purpose until the client wording is added as a new version.

## Edge cases
- No finished attempt: empty state with a button to the chat.
- Unknown wording version: typed error, a generic "could not open" page, logged without personal data.
- Retake: the report shows the latest COMPLETED attempt; an open retake does not hide it.
- Print: navbar and buttons hidden, report stays.

## Verification
- Unit: report builder (bands, ties, try-first), wording guard, `coursesForInterests`.
- Integration: `getLatestReport` ownership, wording version stamped at finish, stranger gets nothing.
- E2E (`tests/e2e/report.spec.ts`, 375px and desktop): quiz opens the report by itself, all sections, banned words absent, reload keeps it, print hides the navbar, empty state, My SELF link.
- Events: `report_viewed` (every visit), `report_action` (`save`, `pdf`, `callback`, `courses`).
- Commands: `npm run lint && npm run typecheck && npm run test && npm run test:int && npm run test:e2e`.
