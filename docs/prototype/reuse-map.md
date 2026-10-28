# Prototype reuse map

The prototype (`prototype-v0`) is about 5,950 lines in 45 files: learner-facing UI only, no backend, state in `localStorage`. This map says what survives into production. Mark rows **done** as they are ported.

**Verdicts:** Keep = as is · Adapt = markup stays, data source or copy changes · Rewrite = logic replaced, salvage layout · Delete.

> **Moved (cleanup, Oct 2026):** `lib/scoring.ts` → `modules/chat/scoring.ts`; `lib/data/discovery.ts` → `modules/chat/questions.ts`; `lib/data/careers.ts` → `modules/chat/careers.ts`; `lib/data/courses.ts` → `modules/catalog/courses.ts`. Routes: `/my-learning` → `/my-self`, pages now sit in `app/(public)` and `app/(learner)`. Deleted: `reset-demo-button.tsx`, salary and outlook fields. Still in place until the port replaces them: `lib/store.ts`, aptitude and values stages (the whole demo UI reads them).

## Size
- Keep ≈ 9% · Adapt ≈ 49% · Rewrite ≈ 25% · Delete ≈ 17% of existing lines.
- A **medium** restructure. The prototype is roughly 25–30% of Phase 1 effort; backend, admin, integrations and infra are the other 70–75%.

## Two structural moves
1. About 15 components read `useAppState()` from `localStorage`; all move to server data plus a session.
2. 22 files are `"use client"`, including the whole course page. Public pages become server-rendered with small client islands.

## Foundation
| File | Verdict | Note |
|---|---|---|
| `app/globals.css` | Keep | Tokens; swap colours when the brand lands |
| `lib/format.ts` | Keep | |
| `components/ui/button, modal, toast, reveal` | Keep | |
| `components/ui/misc.tsx` | Adapt | `SageAvatar` → `GuideAvatar`; `Logo` from brand config; drop `Rating` |
| `components/charts/radar-chart.tsx` | Adapt | Hardwired to RIASEC; generalise to N axes (OCEAN 5 + RIASEC 6) |
| `components/site/navbar.tsx` | Adapt | Session state, mobile menu |
| `components/site/footer.tsx` | Adapt | Drop demo disclaimer; add privacy/terms/refund links |
| `components/site/reset-demo-button.tsx` | Delete | |
| `app/layout.tsx` | Adapt | Session provider, manifest, brand config |
| `app/page.tsx` | Adapt | Copy: Meera, OCEAN + RIASEC, no aptitude/values/certificate/learner-count claims; courses from DB |

## Discovery (Level 0)
| File | Verdict | Note |
|---|---|---|
| `discover/discovery-flow.tsx` | Adapt | Stage machine stays; stages: about → OCEAN → RIASEC → report; server-backed |
| `discover/stage-shell.tsx`, `stepper.tsx` | Adapt | Steps and progress source change; compact mobile stepper |
| `discover/intro-stage.tsx` | Adapt | Meera copy; remove "stakeholder demo" skip; OTP before start |
| `discover/chat-stage.tsx` | Adapt (heavy) | Keep bubbles, typing indicator, chips. Steps and acknowledgement copy move to config. Only the name is typed (D46). Side panel becomes bottom sheet |
| `discover/personality-stage.tsx` | Adapt | Likert UI reused for OCEAN and RIASEC items from config |
| `discover/analyzing-stage.tsx` | Adapt | Loader while the server scores |
| `discover/aptitude-stage.tsx` | Delete | Not in spec |
| `discover/values-stage.tsx` | Delete | Not in spec |
| `discover/results-report.tsx` | Rewrite | Drop aptitude, values, percentile, salary, % fit. Add OCEAN strengths/growth, RIASEC interests + career families, suggested courses, save, print-PDF, callback with consent |
| `home/hero-visual.tsx` | Adapt | Rename; static demo scores are fine for marketing |
| `lib/data/discovery.ts` | Rewrite | Becomes versioned question-set config with fixed IDs; RIASEC items and `DIMENSION_INFO` copy partly salvageable; add OCEAN |
| `lib/scoring.ts` | Rewrite | Pure server-side module; keep the cosine/clamp pattern idea; new OCEAN + RIASEC rules; unit-tested |
| `lib/data/careers.ts` | Reduce | Interest/career families only; no salary, outlook or % fit (D47) |

## Learning (Level 1)
| File | Verdict | Note |
|---|---|---|
| `learn/course-card.tsx`, `course-thumb.tsx` | Adapt | Props from DB course; drop rating and learner counts |
| `learn/course-catalog.tsx` | Adapt | Server-rendered list; client island for filters and "recommended" |
| `learn/course-experience.tsx` | Adapt (heavy) | Split server shell + client islands; drop certificate toast and instructor; add quiz; PDFs via signed URL; sticky mobile CTA |
| `learn/video-player.tsx` | Rewrite | Real HLS via video.js, signed URL, watermark, progress reports; keep the control chrome |
| `learn/checkout-modal.tsx` | Rewrite | Keep review and success screens; replace the fake card/UPI form with hosted checkout (`payments.openCheckout`); poll order status |
| `learn/my-learning.tsx` | Adapt | Moves into the My SELF dashboard |
| `lib/data/courses.ts` | Delete as source | Becomes the DB seed (placeholders); first lesson only is a free preview (per-lesson flag) |
| `lib/store.ts` | Delete | Replaced by server state. Keep the `useHydrated` helper if still needed |

## Spec deltas to remember when porting
- Guide name: Sage → Meera (and keep it in brand/config, not hardcoded).
- Free preview: first lesson only, as a per-lesson `preview` flag (prototype had 2).
- Progress: store position plus completed flag (prototype stored completed IDs only).
- Bundles: a real Product with a fixed price (prototype computed a 30% discount).
- Quiz: new; multiple-choice after a lesson, auto-marked.
- No certificates, no share-link, no ratings, no "demo benchmark" in Phase 1.
