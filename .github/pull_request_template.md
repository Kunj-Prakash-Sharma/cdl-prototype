## What and why
<!-- One or two sentences. Link the spec: docs/specs/<feature>.md -->

Spec: `docs/specs/…`

## How I checked it
- [ ] `npm run lint && npm run typecheck && npm run test` pass
- [ ] Tried it at **375px** (phone) and desktop. Screenshot (phone):
- [ ] New logic has tests (scoring, entitlements, webhooks, rate limits where touched)

## Invariants (tick or explain)
- [ ] No raw chat text stored; answers saved by fixed question ID only
- [ ] No personal data (name, phone, email, free text) in logs or analytics events
- [ ] No card data on our servers; webhooks are signature-checked and idempotent
- [ ] Scoring does not use the AI
- [ ] Modules only talk through `service.ts`; no vendor SDK imported outside `src/integrations`
- [ ] No committed migration was edited (new migration generated instead)

## Docs
- [ ] `docs/decisions.md` / `docs/open-questions.md` updated if a decision changed
