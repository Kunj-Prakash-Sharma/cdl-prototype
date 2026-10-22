---
name: feature-spec
description: Interview the user about a feature, then write docs/specs/<feature>.md from the template. Use before writing any feature code.
---

# feature-spec

Goal: produce a self-contained spec so a fresh session can implement the feature without this conversation.

1. Read `docs/decisions.md`, `docs/architecture/modules.md`, `docs/architecture/integrations.md`, and `docs/specs/_template.md`. Skim any related prototype files listed in `docs/prototype/reuse-map.md`.
2. State the feature in one sentence and check it against the decisions. If it conflicts with a decision, say so and ask.
3. Interview with `AskUserQuestion` (short batches, recommend an option, flag anything that looks over-engineered and offer the simpler workaround). Cover: scope and out-of-scope, which modules and integrations are touched, schema changes (PII columns), routes/actions, UI at 375px, edge cases and abuse cases, analytics events (no PII).
4. Write `docs/specs/<feature>.md` using the template. Name exact files and interfaces. End with a runnable end-to-end verification section.
5. If the interview settled a new decision, add it to `docs/decisions.md` (next `I-n`) and any flag to `docs/open-questions.md`.
6. Stop after the spec. Tell the user to start a fresh session in plan mode to implement it. Do not write feature code.
