# Spec: Chat (Meera quiz, scoring, report)

- **Status:** draft
- **Owner:** Vijay
- **Related decisions:** D18 (no raw chat text), D35/D36 (fixed questions), D43/D46 (auth, name is the only typed input), D47 (careers part), D48 (print-to-PDF), D58 (inactivity), D60 (assessment), **D62 (variants, no AI)**
- **Source of truth for items and scoring:** [../requirements/assessment.md](../requirements/assessment.md). This spec says how to build it; that doc says what the questions, keys, thresholds and examples are. If they disagree, fix the doc first.

## Goal
A logged-in learner chats with Meera through about 26 quick-tap questions (4 basics, 10 OCEAN, 12 RIASEC), gets a saved report (OCEAN strengths and growth areas, RIASEC interest areas, example career families, suggested courses), and can reopen it, print it as PDF, or retake.

## Scope
- Question-set config (versioned) with 2 to 3 variants per item and Meera acknowledgement lines.
- Per-tap answer saving via server action; resume where the learner left off.
- Pure scoring function exactly as in assessment.md section 6.
- Attempts: every start creates an attempt; all kept; report page shows the **latest completed** one.
- Report page `/discover/report` (server-rendered, owner only) with print stylesheet and "Download PDF" button.
- Name: validated (letters, max 30, self-harm/abuse word check, D46) and saved to the learner profile through the auth service.
- Funnel analytics (no PII), inactivity event (D58).
- Docs-first changes already done: D62, modules.md, integrations.md, CLAUDE.md. Remaining doc updates are listed in "Cleanup" below.

## Out of scope
- Callback request and consent: belongs to the `leads` spec; report only has a button that links to it.
- Share links, certificates, aptitude, values, percentile, salary, % fit (not Phase 1).
- My SELF dashboard card for the report (later; link only).
- Hindi/other languages (config supports it; no copy now).
- Real client wording: drafts in assessment.md until approved. Build with the drafts.
- Under-13 stop or any age gate (client choice; lawyer review stays open).
- AI of any kind.

## Files and interfaces

### Module `src/modules/chat/`
| File | Role |
|---|---|
| `question-set.ts` | Versioned config: `QuestionSet` v`1.0.0` (shape in assessment.md section 7), `thresholds`, `scales`, Meera `acknowledgements: string[]`. Data only, no logic. Replaces prototype `questions.ts` |
| `variants.ts` | `pickVariant(sessionId, itemId, count): number` (hash of `sessionId + itemId`, modulo count; use a stable hash such as FNV-1a, not `Math.random`) |
| `scoring.ts` | **Pure** `scoreAttempt(answers: Record<string, number>, set: QuestionSet): ScoreResult`. No imports from db, env, or time. Replaces prototype `scoring.ts` entirely |
| `report.ts` | **Pure** `buildReport(result: ScoreResult, basics: Basics): ReportView` (strength/growth cards from OCEAN bands, Holland code, career families, copy). Report copy lives in `report-copy.ts` |
| `careers.ts` | Reduced: Holland type to 3 to 5 example career families each, plain names only (D47). Delete salary, outlook, % fit, matching maths from the prototype file |
| `name-check.ts` | `validateName(raw, lists?): { ok: true; value: string } \| { ok: false; reason: "format" \| "blocked" \| "abusive" }`. Letters (spaces, apostrophe, hyphen and combining marks allowed), max 30 (JS string length), **allowed scripts only: Latin, nine Indian scripts and Arabic for Urdu, one script per word** (closes the look-alike bypass; "आशा Verma" is fine), stored in NFKC form. Two blocklists with different outcomes: **self-harm** phrases give `blocked` (helpline stop screen, attempt ended); **abuse** words give `abusive` (ask again, no helpline, attempt stays open, because a real name can collide with an abuse word). Lists are data in `name-blocklist.ts`: a TEMPORARY English + Hinglish + Devanagari set (abuse terms from the LDNOOBW list, CC BY 4.0, credit required; self-harm phrases are our own, unreviewed), to be replaced by the client's list |
| `schema.ts` | Drizzle tables (below) |
| `repo.ts` | DB access only |
| `service.ts` | Public API, below |
| `actions.ts` | Server actions: `startAttempt`, `retake`, `submitAnswer`, `submitName`, `finishAttempt`, `retryStage`. zod-validated, thin; each calls `requireUser()` (a logged-out visitor is sent to login) and never reads a user id from the client. `submitName` passes auth's `updateProfileName` to the service as the name saver, so chat never touches auth. Unexpected errors are logged without personal data and answered as `unknown` |

### Types (shapes; fix exact names while coding)
```ts
type ScoreResult =
  | { status: "ok"; ocean: Record<"O"|"C"|"E"|"A"|"N", {score:number; band:"lower"|"middle"|"higher"}>;
      riasec: Record<"R"|"I"|"A"|"S"|"E"|"C", number>;
      holland: { letters: string[]; close: boolean } | { flat: true } }
  | { status: "incomplete"; stage: "ocean" | "riasec" }
  | { status: "invalid"; stage: "ocean" | "riasec" };   // straight-lining
```
Scoring is per stage; a stage that is `invalid` or `incomplete` blocks the report for that stage (assessment.md section 6).

### `service.ts` (public to other modules and pages)
Functions take a `Learner` (`{ userId, name }`, built by the caller from auth's `requireUser()`) and return `{ ok: true, ... }` or `{ ok: false, code }` (never throw for expected cases). Codes: `invalid_input`, `not_found` (missing **or someone else's** attempt, the same answer), `attempt_closed`, `out_of_order`, `incomplete`, `stage_invalid`, `not_allowed`, `unknown`. Every attempt function checks ownership and loads the question set from the attempt's own `set_version`.
- `startOrResumeAttempt(learner)`: resumes the open attempt, else creates one (race-safe through the unique index). Returns `{ attemptId, resumed, next }`.
- `getNextStep(learner, attemptId)`: the first question without a saved answer, recomputed each time (no stored counter). A `NextStep` carries text, scale labels and progress for the UI, never keys, scores or sources: `{ kind: "name" | "basics" | "question" | "done", ... }`.
- `submitAnswer(learner, attemptId, questionId, value)`: upsert; rejects unknown questions, values outside the scale or option list, the name, and questions not reached yet (`out_of_order`; earlier ones can be changed). The server picks and stores the variant. Returns `{ next, acknowledgement }`.
- `finishAttempt(learner, attemptId)`: scores with the attempt's own set, stores result + status in **one transaction**; idempotent; `incomplete` or `stage_invalid` (with the stage) when it cannot score.
- `retryStage(learner, attemptId, stage)`: clears that stage's answers, only if it really scored invalid.
- `retake(learner)`: a new attempt, unless one is open, which is resumed (no pile of empty attempts).
- `abandonAttempt(learner, attemptId)`: ends an attempt for good (blocked name); never resumed.
- `getLatestResult(userId)`: the newest completed attempt's result, or null. (`getLatestReport` with course suggestions is 4d.)
- Pure helpers: `flow.ts` (order, progress, next step, answer checks), `result.ts` (score to row and back), `types.ts` (client-safe types). Other modules call only `service.ts`. `commerce`/`catalog` never read chat tables.

### Integrations used
- `@/integrations/analytics`: `track(sessionId, event, props)`. **No `ai` integration** (D62).
- Auth: `requireUser()` from `modules/auth` (service only). Name update through an auth service function `updateProfileName(userId, name)` (**add to the auth spec/service if missing**; chat must not touch auth tables).
- Catalog: `catalog.service.coursesForInterests(letters: string[]): Promise<CourseSummary[]>` (**new**, see below). Chat never imports catalog `repo`/`schema`.

### Schema changes (Drizzle; run `npm run db:generate`, never edit a committed migration)
- `chat_attempts`: `id` uuid pk, `user_id` (foreign key to `auth_user`, cascade on delete: the one allowed cross-module import, for the foreign key only, see modules.md), `set_version` text, `status` enum (`in_progress`, `completed`, `invalid`, `abandoned`), `started_at`, `last_answer_at`, `completed_at` null. Session id for analytics = attempt id. **A partial unique index allows only one `in_progress` attempt per learner** (two tabs cannot both create one).
- `chat_answers`: `attempt_id` fk, `question_id` text, `variant_id` text (null for basics), `value` smallint (1 to 5 for scored items; option index for basics), `answered_at`. **Primary key (attempt_id, question_id)** gives the upsert. No question text, no free text (D18). The name is **not** stored here.
- `chat_results`: `attempt_id` pk/fk, `set_version`, `scores` jsonb (per-dimension numbers and bands), `holland` text null (e.g. `ISA`), `holland_close` boolean, `flat` boolean, **`stage_status` jsonb** (one entry per stage, e.g. `{"ocean":"ok","riasec":"ok"}`, so a new stage needs no new column; replaces the two `ocean_status` / `riasec_status` columns), `created_at`.
- Column names are snake_case. Migration: `drizzle/0001_pale_rattler.sql`.
- Basics (`b-age`, `b-status`, `b-goal`) are rows in `chat_answers` like any other.
- **PII columns:** none new. `user_id` links to the auth profile where the name lives; comment this in `schema.ts`.
- Catalog: add `riasec_types` (text array, e.g. `{I,S}`) to the course table via the catalog module (own migration, set in admin later; seed placeholders). `coursesForInterests` returns published courses whose `riasec_types` overlap the code, ranked by overlap count then course order.

### Routes / actions
- `/discover` (exists): the chat flow. Auth guard `(learner)` already redirects to `/login` (OTP before start).
- `/discover/report`: server component; reads `getLatestReport`; owner only; empty state links back to `/discover`.
- Server actions above. No REST handlers needed (D42). The UI contract is the typed result: `{ ok: true, ... }` or `{ ok: false, code, retryAfterSec? }`; codes are in `types.ts` (the UI owns all wording).

### UI (port with `/ui-port`; tokens only, 375px + desktop)
Reuse and adapt prototype components in `src/components/discover/` (see [../prototype/reuse-map.md](../prototype/reuse-map.md)):
- **Built (2026-11-03):** `chat-flow.tsx` draws whatever the server's `NextStep` says (no stage machine, no `localStorage`); `chat-card.tsx` (name and tap questions in the prototype's bubble look), `scale-question.tsx` (the round-button scale: statement, labels and number of buttons come from the step), `progress-header.tsx`, `status-screens.tsx` (finishing loader, try again, stop screen, temporary saved-result view), `helpline-link.tsx`, `chat-messages.ts` (UI-owned wording for error codes). `page.tsx` resumes or starts the attempt on the server, and shows the saved result with a retake button to a learner who finished and has nothing open.
- **No hardcoding (D68), enforced by `no-hardcoding.test.ts`:** no UI file may contain question ids, counts, part names, scale words, the guide or product name, a raw colour, or an import of server-only question data.
- Deleted: `discovery-flow`, `intro-stage`, `chat-stage`, `personality-stage`, `aptitude-stage`, `values-stage`, `analyzing-stage`, `stepper`, `stage-shell`.
- `results-report.tsx`: **rewrite** to the report in assessment.md section 8; print stylesheet; radar chart generalised to N axes (5 OCEAN + 6 RIASEC) or two charts.
- **Delete** `aptitude-stage.tsx`, `values-stage.tsx` and aptitude/values/percentile code paths.
- A "Try again" screen for `invalid` stages (copy: "Your answers were all the same. Want to try that part again?").
- **A helpline link that is always visible** on every chat screen, the stop screen and the report (D70). It is the primary safety measure and does not depend on any text matching. Wording, number and link are data in `src/config/helpline.ts` (placeholder until the client supplies them).
- The self-harm stop screen with the same helpline message (the name check is the backup; copy and link from the client; placeholder until then).

## Rules and invariants that apply
- No raw chat text stored; answers by question ID + variant ID + value (D18). The name goes to the profile only.
- No personal data in logs or analytics events.
- Scoring is a pure function of question IDs and values; no AI, no randomness, no clock.
- Variants never change polarity; scoring ignores `variantId`.
- Modules talk through `service.ts` only (auth for the name, catalog for courses).
- Handlers thin: zod-validate, `requireUser()`, call service, return.
- Server-rendered report; `"use client"` only for the chat UI and print button.
- Out-of-Phase-1 list in CLAUDE.md (no aptitude, values, certificates, share links, ratings, salary/% fit).

## Edge cases
- Refresh or resume mid-quiz: same variants (deterministic pick), resumes at the first unanswered item.
- Double tap / retry: upsert, no duplicate rows. Answer for an item already answered overwrites it (allow "back" one step only if the UI offers it).
- Out-of-range value, unknown item ID, item from a later stage: rejected.
- Name fails format, mixes scripts or uses a script that is not allowed: ask again (`name_format`). Name is an abuse word: ask again, no helpline, the attempt stays open (`name_format`). Name hits the self-harm list: stop screen with the helpline, attempt marked `abandoned`, no name saved, no further questions (`name_blocked`).
- Straight-lining: stage `invalid`, offer retry of that stage; the attempt does not complete until fixed (rows for that stage cleared on retry).
- Incomplete (abandoned after D58 inactivity): `chat_exited` fires; the attempt stays resumable; it never produces a report until complete.
- Question set version changes mid-attempt: the attempt keeps its `set_version`; score against that version (keep old set configs in the repo, never delete).
- Flat RIASEC: no Holland code; the report shows the "broad interests" message and suggests courses by the basics' goal only if the catalog supports it (else just "browse courses").
- Report opened with no completed attempt: empty state.
- Two tabs: last write wins per item; no corruption (unique key).
- Retake: a new attempt; old report stays visible until the new one completes.
- Rate limit: 60 answers or names per learner per minute (`limits.ts`, in memory per app instance, so with several instances the real cap is higher: enough to stop a scripted flood, not for billing). Over the cap answers `rate_limited` with `retryAfterSec`.
- Blocked name: `name_blocked`, the attempt is ended (abandoned), nothing is saved. Bad format: `name_format`, ask again. A stranger's blocked-word request cannot end someone else's attempt (ownership is checked first).

## Cleanup (done as part of this feature)
- Delete or rewrite prototype `src/modules/chat/questions.ts`, `scoring.ts`, aptitude/values/percentile code, the `careers.ts` matching maths, and unused `lib/store.ts` chat state.
- Remove `src/integrations/ai/` and the `AI_PROVIDER` switch (`src/lib/env-schema.ts`, `.env.example`, any docs link).
- Update `docs/requirements/architecture.md` event list and `src/integrations/analytics/types.ts` for the events below.
- Reuse map: mark discovery rows **done** as ported.

## Analytics (typed in `EventMap`; no PII)
Existing in `src/integrations/analytics/types.ts`: `chat_started`, `chat_step` (stage, messageNumber, inputType, secondsTaken; one per answer, gives the exit point for D18), `chat_exited` (lastStage, lastMessageNumber; D58), `report_viewed`, `report_action`.
**Add:** `chat_stage_completed { stage, setVersion }`, `chat_completed { setVersion, hollandClose: boolean, flat: boolean }`, `chat_invalid { stage }`, `chat_retake {}`.
PDF click uses existing `report_action { action: "pdf" }` (equals "report_pdf_clicked"). `sessionId` = attempt id. Never send name, age band text or any answer text. Property values are codes only (e.g. stage names).

## Verification (end to end)
Unit tests (vitest, run a single file at a time):
- `scoring.test.ts`: the four worked examples F1 to F4 in assessment.md (F1 tie-break gives `ISA` and `close: true`; F2 `RIA` ranked; F3 invalid and flat-but-varied gives no code; F4 incomplete). Reverse keying per item; rounding half up (12.5 gives 13); OCEAN band edges 37/38 and 62/63; spread edge 13 versus 14; minimum 80%; straight-lining detection per stage; scoring ignores unknown keys.
- `variants.test.ts`: deterministic for the same input; every index reachable over many sessions; same polarity (assert each variant exists under an item with a single `key`).
- `question-set.test.ts`: IDs unique; counts 4/10/12; every scored item has 2 to 3 variants; every dimension has 2 items; each OCEAN trait has one `+` and one `-`; RIASEC items all `+`; variants under 90 chars.
- `name-check.test.ts`: letters only, max 30, both blocklists and their different outcomes, script allowlist and mixed-script words, apostrophes/hyphens, NFKC, trims, and a sample of common Indian names that must never be blocked.
- `service.test.ts` (against test DB or mocked repo): resume, upsert, out-of-range rejection, finish writes result, retake creates a new attempt, `getLatestReport` returns the newest completed.
- `report.test.ts`: no forbidden fields (assert absence of percentile, salary, fit); Neuroticism label is "emotional steadiness"; footer line present.

Manual and Playwright (375px mobile + desktop):
- Log in (fake SMS), start `/discover`, answer all 26, see the report; refresh mid-quiz and confirm same wording and position; enter a blocked name and see the helpline stop; answer all-same RIASEC and see "try again"; retake and see the new report; Download PDF opens a clean print view.
- Check the analytics fake adapter logs: events fire in order with no PII.

Commands:
`nvm use && npm run db:generate && npm run db:migrate && npm run lint && npm run typecheck && npm run test && npm run test:e2e`

Before merge: `/code-review`. Not a payments/auth feature, but run `/security-review` on the name handling and server actions.

## Open items carried
- Client approval of item and variant wording, report copy, thresholds (open-questions.md).
- Helpline link/wording and the blocklist words (client). The Hindi/Hinglish list in the code is temporary and unreviewed; regional languages are not covered.
- Auth service must expose `updateProfileName` (add to the auth spec if absent).
- Catalog spec/admin must support `riasec_types` on courses.
