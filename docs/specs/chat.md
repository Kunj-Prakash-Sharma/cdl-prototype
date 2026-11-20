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
| `name-check.ts` | `validateName(raw): { ok: true; value: string } \| { ok: false; reason: "format" \| "blocked" }`. Letters (incl. spaces, apostrophe, hyphen), max 30, blocklist for self-harm/abuse words (list provided with helpline copy by client; ship a small placeholder list, flagged) |
| `schema.ts` | Drizzle tables (below) |
| `repo.ts` | DB access only |
| `service.ts` | Public API, below |
| `actions.ts` | Server actions: `startAttempt`, `submitAnswer`, `submitName`, `finishAttempt`, `retake`. zod-validated, thin |

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
- `startOrResumeAttempt(userId): Promise<{ attemptId; next: NextStep }>`: resumes the latest unfinished attempt, else creates one.
- `getNextStep(attemptId): Promise<NextStep>`: `{ kind: "name" | "basics" | "question"; itemId; variantId; text; scale; progress }` or `{ kind: "done" }`.
- `submitAnswer(attemptId, itemId, value): Promise<NextStep>`: upsert by (attempt, item); rejects values outside the item's scale and unknown item IDs; stores the variant that `pickVariant` assigned.
- `finishAttempt(attemptId): Promise<ScoreResult>`: runs `scoreAttempt`, stores result, sets status.
- `getLatestReport(userId): Promise<ReportView | null>`.
- `retake(userId): Promise<{ attemptId }>`.
- Other modules call only these. `commerce`/`catalog` never read chat tables.

### Integrations used
- `@/integrations/analytics`: `track(sessionId, event, props)`. **No `ai` integration** (D62).
- Auth: `requireUser()` from `modules/auth` (service only). Name update through an auth service function `updateProfileName(userId, name)` (**add to the auth spec/service if missing**; chat must not touch auth tables).
- Catalog: `catalog.service.coursesForInterests(letters: string[]): Promise<CourseSummary[]>` (**new**, see below). Chat never imports catalog `repo`/`schema`.

### Schema changes (Drizzle; run `npm run db:generate`, never edit a committed migration)
- `chat_attempts`: `id` uuid pk, `user_id` (fk to auth user), `set_version` text, `status` enum (`in_progress`, `completed`, `invalid`, `abandoned`), `started_at`, `last_answer_at`, `completed_at` null. Session id for analytics = attempt id.
- `chat_answers`: `attempt_id` fk, `question_id` text, `variant_id` text, `value` smallint (1 to 5 for scored items; option index for basics), `answered_at`. **Unique (attempt_id, question_id)** for upsert. No question text, no free text (D18). The name is **not** stored here.
- `chat_results`: `attempt_id` pk/fk, `set_version`, `scores` jsonb (per-dimension numbers and bands), `holland` text null (e.g. `ISA`), `holland_close` boolean, `flat` boolean, `ocean_status`, `riasec_status`, `created_at`.
- Basics (`b-age`, `b-status`, `b-goal`) are rows in `chat_answers` like any other.
- **PII columns:** none new. `user_id` links to the auth profile where the name lives; comment this in `schema.ts`.
- Catalog: add `riasec_types` (text array, e.g. `{I,S}`) to the course table via the catalog module (own migration, set in admin later; seed placeholders). `coursesForInterests` returns published courses whose `riasec_types` overlap the code, ranked by overlap count then course order.

### Routes / actions
- `/discover` (exists): the chat flow. Auth guard `(learner)` already redirects to `/login` (OTP before start).
- `/discover/report`: server component; reads `getLatestReport`; owner only; empty state links back to `/discover`.
- Server actions above. No REST handlers needed (D42).

### UI (port with `/ui-port`; tokens only, 375px + desktop)
Reuse and adapt prototype components in `src/components/discover/` (see [../prototype/reuse-map.md](../prototype/reuse-map.md)):
- `discovery-flow.tsx`: stage machine becomes about, OCEAN, RIASEC, report; state from the server (no `localStorage`).
- `chat-stage.tsx`: bubbles, typing indicator, chips; steps and acknowledgements from config; only the name is typed; the side panel becomes a bottom sheet.
- `personality-stage.tsx`: the Likert UI renders both OCEAN and RIASEC from config (labels per scale).
- `analyzing-stage.tsx`: loader while `finishAttempt` runs.
- `results-report.tsx`: **rewrite** to the report in assessment.md section 8; print stylesheet; radar chart generalised to N axes (5 OCEAN + 6 RIASEC) or two charts.
- **Delete** `aptitude-stage.tsx`, `values-stage.tsx` and aptitude/values/percentile code paths.
- A "Try again" screen for `invalid` stages (copy: "Your answers were all the same. Want to try that part again?").
- The self-harm stop screen with the helpline message (copy and link from the client; placeholder until then).

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
- Name fails format: ask again; name hits the blocklist: stop screen with the helpline, attempt marked `abandoned`, no name saved, no further questions.
- Straight-lining: stage `invalid`, offer retry of that stage; the attempt does not complete until fixed (rows for that stage cleared on retry).
- Incomplete (abandoned after D58 inactivity): `chat_exited` fires; the attempt stays resumable; it never produces a report until complete.
- Question set version changes mid-attempt: the attempt keeps its `set_version`; score against that version (keep old set configs in the repo, never delete).
- Flat RIASEC: no Holland code; the report shows the "broad interests" message and suggests courses by the basics' goal only if the catalog supports it (else just "browse courses").
- Report opened with no completed attempt: empty state.
- Two tabs: last write wins per item; no corruption (unique key).
- Retake: a new attempt; old report stays visible until the new one completes.
- Rate limit on `submitAnswer` per user (simple per-minute cap) to stop scripted floods.

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
- `name-check.test.ts`: letters only, max 30, blocklist, apostrophes/hyphens, trims, Unicode letters.
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
- Helpline link/wording and the blocklist words (client).
- Auth service must expose `updateProfileName` (add to the auth spec if absent).
- Catalog spec/admin must support `riasec_types` on courses.
