# SELF — Claude instructions

Phase 1 of SELF: a mobile-first career-discovery + learning site (Meera chat → report → paid courses), built as a **modular monolith** (one Next.js app = pages + API, plus a worker, one repo). "SELF" is a working name: never hardcode it (use `src/config/brand.ts`).

@AGENTS.md
@docs/architecture/integrations.md

## Read before feature work
- `docs/decisions.md` — every decision (D* from the architecture doc, I-* from our interview). Newest wins.
- `docs/architecture/modules.md` — 9 modules, folder layout, boundary rules.
- `docs/design/design-system.md` — tokens, patterns, mobile rules.
- `docs/prototype/reuse-map.md` — what to keep/adapt/rewrite from the prototype (tag `prototype-v0`).
- `docs/requirements/` — scope and architecture source docs. `docs/open-questions.md` — flags.
- `docs/specs/<feature>.md` — the spec for the feature you are building. **No spec, no feature code:** run `/feature-spec` first.

## Commands
Run `nvm use` first (Node 22; the shell may default to 23).
- `npm run dev` / `build` / `lint` / `typecheck` / `format`
- `npm run test` (vitest) · `npm run test:e2e` (playwright, 375px mobile + desktop)
- `npm run db:generate` / `db:migrate` / `db:seed` / `db:studio` (Postgres via `docker compose up -d`)
- `npm run worker` (pg-boss worker) · `npm run build:worker`
- Prefer running a single test file over the whole suite.

## Architecture rules
- Modules talk to each other **only through `service.ts`**. Never import another module's `repo`, `schema` or `actions`.
- Handlers and server actions stay thin: zod-validate input → check session/role → call a service → return.
- Server actions for our own screens; REST route handlers only for webhooks, uploads and the worker.
- Modules import `@/integrations/<name>` only, never a vendor SDK. Interfaces are in our terms.
- Auth: only `modules/auth` touches Better Auth; others use `requireUser()` / `requireAdmin()` / `getSession()`.
- Public pages are server-rendered; interactive bits are small client islands (`"use client"` only where needed).
- Next 16 has breaking changes: read `node_modules/next/dist/docs/` before writing Next code.

## Database rules
- Drizzle. Change `schema.ts`, then `npm run db:generate`. **Never edit a committed migration**; generate a new one.
- Orders (what was bought) and entitlements (what may be accessed) are separate tables.
- Mark PII columns (phone, email, name) in a schema comment.

## IMPORTANT invariants (never break)
- **No raw chat text stored.** Store answers by fixed question ID only (D18).
- **No personal data in logs or analytics events** (no name, phone, email, free text). No ad pixels.
- **Card data never touches our servers.** Payments use hosted checkout; webhooks are signature-checked and **idempotent**.
- **Scoring never uses the AI.** Scoring is a pure, unit-tested function. The AI only rewords fixed questions and must fall back to the approved wording.
- The only typed input in the chat is the name (letters, max 30, self-harm/abuse word check).
- Video access is signed + expiring and checked against entitlements.

## UI rules
- Use design tokens from `src/app/globals.css`; no raw hex. Mobile-first; check at 375px and desktop.
- Out of Phase 1: certificates, share links, ratings, learner counts, salary/% fit, aptitude/values quizzes.

## Workflow
1. `/feature-spec` → write `docs/specs/<x>.md` (interview first).
2. Fresh session, plan mode, implement against the spec; write tests; run lint + typecheck + test.
3. Before merge: `/code-review`, and "review the diff against `docs/specs/<x>.md` with a subagent" (correctness gaps only). Use `/security-review` for auth, payments and webhooks.
4. Work on a branch, open a PR, CI green before merging to `main`. **Never commit or push unless the user asks.**
5. `/clear` between unrelated tasks. Update the docs when a decision changes (docs first, then code).

## Compaction
When compacting, always preserve: the list of modified files, the active spec path, and the test commands.
