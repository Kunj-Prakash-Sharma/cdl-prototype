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
| `components/ui/misc.tsx` | Adapt | **Done** (2026-11-19): `SageAvatar` → `GuideAvatar`, `Logo` from brand config, colours on tokens. `Rating` stays until the course page (row 9) drops it |
| `components/charts/radar-chart.tsx` | **Deleted** (2026-11-19) | Was hardwired to the prototype dimensions and unused; the V5 report draws its own bars. Build a new N-axis chart if a design asks for one |
| `components/site/navbar.tsx` | Adapt | Session state, mobile menu |
| `components/site/footer.tsx` | Adapt | Drop demo disclaimer; add privacy/terms/refund links |
| `components/site/reset-demo-button.tsx` | Delete | |
| `app/layout.tsx` | Adapt | Session provider, manifest, brand config |
| `app/page.tsx` | Adapt | Copy: Mira, OCEAN + RIASEC, no aptitude/values/certificate/learner-count claims; courses from DB |

## Discovery (Level 0)
| File | Verdict | Note |
|---|---|---|
| `discover/discovery-flow.tsx` | **Done** (2026-11-03) | Replaced by `chat-flow.tsx`: draws the server's next step (name, tap questions, scale question, finishing, try again, stop, saved result); no stage machine, no `localStorage` |
| `discover/stage-shell.tsx`, `stepper.tsx` | **Done** (deleted) | Replaced by `quiz-stepper.tsx` and `stage-header.tsx` (a bar and "answered of total" from the server's numbers) |
| `discover/intro-stage.tsx` | **Done** (deleted) | The learner resumes at the first unanswered question; no intro screen |
| `discover/chat-stage.tsx` | **Done** | Bubbles, typing indicator and chips kept in `chat-card.tsx` and `chat-bubbles.tsx`; wording from the question set; only the name is typed; no side panel |
| `discover/personality-stage.tsx` | **Done** | Round-button scale kept in `scale-question.tsx`; the statement, labels and number of buttons come from the step |
| `discover/analyzing-stage.tsx` | **Done** | Pulsing loader in `status-screens.tsx` (`FinishingScreen`) while `finishAttempt` runs |
| `discover/aptitude-stage.tsx` | **Done** (deleted) | Not in spec |
| `discover/values-stage.tsx` | **Done** (deleted) | Not in spec |
| `discover/results-report.tsx` | **Done** (deleted 2026-11-19) | Replaced by `components/report/*` (V5 rows 5 and 6): OCEAN strengths/growth, RIASEC interests and career families, suggested courses, print-PDF, callback with consent. No aptitude, values, percentile, salary or % fit |
| `home/hero-visual.tsx` | **Deleted** (2026-11-19) | The V5 home (row 7) has its own hero; the old visual was unused |
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
- Guide name: Sage → Mira (and keep it in brand/config, not hardcoded).
- Free preview: first lesson only, as a per-lesson `preview` flag (prototype had 2).
- Progress: store position plus completed flag (prototype stored completed IDs only).
- Bundles: a real Product with a fixed price (prototype computed a 30% discount).
- Quiz: new; multiple-choice after a lesson, auto-marked.
- No certificates, no share-link, no ratings, no "demo benchmark" in Phase 1.

## V5 screens (D91)
Each screen is ported to the V5 design with `/ui-port` (reference: the V5 artboards of the "SELF Website Redesign" canvas, https://claude.ai/artifact/LZQHUV8x22RTPgQTFGPwbh). "UI only" = no backend change; the others wait for a module (see the D91 table in [../open-questions.md](../open-questions.md)). Mark **Done (date)** as each lands.
| # | V5 artboard | Our files | Backend change? | Status |
|---|---|---|---|---|
| 1 | Tokens and fonts (all artboards) | `app/globals.css`, `app/layout.tsx` | UI only | **Done** (2026-11-17) |
| 2 | Header, offer bar, footer | `site/navbar.tsx`, `site/footer.tsx`, `site/site-shell.tsx`, `ui/button.tsx`, `ui/misc.tsx` | UI only (offer is sample content, D92) | **Done** (2026-11-18): sample offer from `content/samples.ts`; guide renamed Mira; footer legal links wait for the pages (E2-FE3). My Learning count removed (2026-11-19): it read this browser's demo storage; it returns with purchases from `commerce` |
| 3 | `V5-Login` | `auth/login-form.tsx`, `(public)/login/page.tsx` | UI only | **Done (2026-11-18)**: card, hero-glow page, Outfit heading, brand-200 disabled button; the number field is white on the card (2026-11-20, as the artboard), the code field keeps the paper fill. Same card is used by the report gate. Artboard email tab and "You are logged in" state not built (OTP only; /login redirects when signed in); the artboard keeps the V5 white footer on this page, ours uses the shared footer |
| 4 | `V5-Discover` (chat + quiz) | `discover/*` | UI only ("Choose two" is NOT built: needs chat changes) | **Done (2026-11-18)**: stage bar, chat card (Mira avatar, bubbles, pill composer, quick-reply chips), quiz card with round 1-to-n buttons, desktop side panel (percent done, sample launch offer, privacy line), status screens and guest start. Not built: free-text composer (name only, D18), "Choose two" and multiple-choice cards (no such question types), minutes-left estimate and Save and exit (no timing or save-exit flow), How we score link (page open), per-part test tiles (the step bar already shows parts). Phone hides the side panel |
| 5 | `V5-Discover` (report, gate, callback) | `report/*` | UI only for the existing data (persona title and strength scores need chat changes) | **Done (2026-11-18)**: hero (interest code, next-step course), jump links, personality, interests (radar, bars, top-3 with career families), courses, callback card, gate over blurred sample. Persona title and strengths/growth are sample content shown only outside production (D92, `content/samples.ts`). **Updated 2026-11-20:** the persona is real report data (D88): name and tagline in the hero, its 3 strengths and 2 growth areas (title + line, no scores) on screen and in the PDF, in production too, with the "Draft wording" tag on the screen hero and the PDF cover (a flat profile's copy says its persona is the all-round one); the report samples are gone from `samples.ts`. Still left out: scored strengths and a course per growth area (D88 has neither). **Checked against the artboard 2026-11-20:** trait scores now sit in a round marker on the bar, as in V5 (the scale-end labels wait for wording). Left out (backend, D92): course price/image/lessons, named coach, time-slot ranges, "Generated by AI" note (no AI in quiz, D62). Overview ring (V2 variant) not built |
| 6 | `V5-Report-PDF-1…5` | print stylesheet on the report | UI only | **Done (2026-11-18)**: a print-only A4 document (`report-print.tsx`: cover, personality, interests, strengths, about; running footer; page numbers from the browser (`@page` counters, Chrome and Edge), so they stay right when a section runs over) replaces the screen report when printing. Left out: learner name on cover and footer (not in report data), plain-language scale ends and the "What your IAS code means" paragraph (wording), page 6 career paths and the 65/35 note (not Phase 1). Persona, top strength, area to grow and the strengths page are sample content, outside production only (D92) |
| 7 | `V5-Home` | `(public)/page.tsx`, `home/*` | UI only (stories and coupon wait for content) | **Done (2026-11-18)**: hero starts the chat on /discover (feedback 4973), so the in-page chat is a static preview; stories, coach and launch offer are sample content (`content/samples.ts`); course cards still the old card until row 8; Book a free call waits for an anonymous callback (needs `leads` change); **updated 2026-11-20:** the preview card's question and quick replies come from the question set (`chat.getHomeQuestion`), a tap keeps the answer in the tab (for 10 minutes; Home forgets it when it shows the replies again) and the quiz applies it once and shows it as answered with Change (D87): the label, reply and Change step come back from `applyHomeAnswer`, built from the attempt's own question set; Book a free call opens the callback form for a logged-in learner, no report needed, and sends anyone else to login and back to Home (D90). The artboard's typed mobile number is not built (we call the verified number); old stats/how-it-works/levels sections dropped as not in V5 |
| 8 | `V5-Courses` | `learn/course-catalog.tsx`, `learn/course-card.tsx` | UI on sample data now; real data needs `catalog` | **Done (2026-11-18)**: restyled on the existing 9 sample courses (rating, learner count, instructor, sort dropped); the 8 V5 courses wait for `catalog`; search kept (client-side). "Recommended for you" (old prototype scoring on demo storage) removed 2026-11-19; everyone sees the way into the chat until recommendations come from the saved report |
| 9 | `V5-Course-*` | `learn/course-experience.tsx`, `video-player.tsx`, `checkout-modal.tsx` | UI on sample data now; real data needs `catalog`, `commerce`, `video` | **Done (2026-11-24)**: header (breadcrumb, title with one brand word, price and Unlock, or course progress when enrolled), navy player with gold accents (D94: pill play button, seek bar with ←/→ 5 s, ±10 s, speed, captions, full screen; locked and finished overlays), Previous / Next / Mark complete, Overview and Resources tabs, Course content card (numbered rows, done / now playing / free preview / locked), sticky price bar on phones. Checkout is the review step only (D92): the demo card, UPI and bank fields are gone, Pay still unlocks the course in this browser. Not built: per-lesson chapters and notes (no data), coach card (instructor names out of Phase 1), coupon chip on the price, certificate on completion, the careers list and "Recommended for you" (old prototype scoring). `Rating` and `Avatar` removed from `ui/misc` |
| 10 | `V5-Learn`, `V5-Learn-s1…s7` | `(learner)/my-self`, `learn/my-learning.tsx` | UI on sample data now; real data needs `commerce` (entitlements) and progress | **Done (2026-11-24)**: hero (pill, heading, Continue learning card for the first started course, the career report card restyled under it), Enrolled courses grid on the V5 course card (Enrolled tag, x of y lessons, Start / Continue learning / Review course), empty state, More courses to explore (first 4 not owned; "for you" dropped since it is not personal yet). Purchases and progress still come from the browser demo store. Not built: the account card (the page needs a login; the header has the account menu), the prototype-view switcher |
| 11 | `V5-Method` (How we score) | new page | UI only, but needs a decision (D72 skipped it) | blocked on decision |
