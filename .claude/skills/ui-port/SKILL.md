---
name: ui-port
description: Port a prototype component or screen into production (tokens, server/client split, mobile-first) and compare a 375px screenshot against the prototype. Use when moving a screen from the prototype.
---

# ui-port

Argument: the prototype file or screen to port (e.g. `course-card`, `/learn`).

1. Look it up in `docs/prototype/reuse-map.md` for the verdict (keep / adapt / rewrite) and the notes. Read `docs/design/design-system.md`.
2. Read the prototype source. List what changes: data source (`useAppState` → server data/props), Phase-1-out items (ratings, certificates, learner counts, share, aptitude/values), brand/guide name from `src/config/brand.ts`.
3. Decide the server/client split: server component by default; extract the smallest interactive parts as client islands.
4. Port with design tokens only, mobile-first. Keep the existing look; do not redesign.
5. Add or update tests for any logic moved (not for pure markup).
6. Verify: `npm run lint && npm run typecheck`. Then compare screenshots at 375×667 and desktop against the prototype reference (live site cdl-prototype.vercel.app or `git worktree` at tag `prototype-v0`), and list differences and fix them.
7. Mark the row **done** in `docs/prototype/reuse-map.md`.
