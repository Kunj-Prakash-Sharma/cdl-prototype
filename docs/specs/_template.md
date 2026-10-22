# Spec: <feature name>

> Copy this file to `docs/specs/<feature>.md`. Write the spec **before** the code. Keep it self-contained: a fresh session should be able to implement it from this file alone.

- **Status:** draft | approved | implemented
- **Owner:** <name>
- **Related decisions:** <I-x / D-x from `docs/decisions.md`>

## Goal
One or two sentences: what a user or the team can do after this ships.

## Scope
What is in. Name the user-facing behaviour and the data touched.

## Out of scope
What is explicitly not part of this feature (and where it goes instead, e.g. "Phase 2").

## Files and interfaces
- **Module(s):** `src/modules/<name>/` (service functions added or changed, with signatures)
- **Integrations used:** `src/integrations/<name>/` (interface methods)
- **Schema changes:** tables and columns (note any PII column)
- **Routes / actions:** pages, server actions, REST handlers
- **UI:** components to port or create (tokens only; check 375px)

## Rules and invariants that apply
Pick from `CLAUDE.md`: no chat text stored, no PII in logs or events, no card data, scoring never uses AI, webhooks idempotent, modules talk only via `service.ts`.

## Edge cases
List the failure and abuse cases (rate limits, retries, duplicate webhooks, empty states, offline).

## Verification (end to end)
Concrete, runnable steps that prove it works. Include:
- unit tests to add (what they assert)
- the manual or Playwright path at 375px and desktop
- the exact commands: `npm run lint && npm run typecheck && npm run test`
- analytics events that must fire (name and properties, no PII)
