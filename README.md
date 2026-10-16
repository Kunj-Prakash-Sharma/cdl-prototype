# SELF — Career Discovery & Learning (UI prototype)

Clickable prototype of **SELF**, the career development and learning platform, and **CDL (AI Career Discovery)**.
UI only: dummy data, no backend, no real AI, no auth, no payments. All state lives in the browser's `localStorage`.

## Run it

Requires Node 22 (pinned in `.node-version`, picked up automatically by `fnm use` / `--use-on-cd`).

```bash
fnm use            # switches to Node 22
npm install
npm run dev        # http://localhost:3000
```

Production build: `npm run build && npm start`.

## The journey

| Route | What it shows |
| --- | --- |
| `/` | SELF landing: value prop, how it works, CDL spotlight, report preview, learning levels, courses, FAQ |
| `/discover` | **One page** for the whole CDL flow: intro → chat with Sage → personality (RIASEC Likert) → aptitude quiz → work values → analysing → personalised report |
| `/learn` | Level 1 catalogue: filters, search, sort, plus “Recommended for you” once the report exists |
| `/learn/[slug]` | Course page: simulated video player, curriculum, resources. 2 free preview lessons; everything else unlocks after simulated checkout |
| `/my-learning` | Purchased courses with progress |

Level 2 (live cohorts) and Level 3 (1:1 mentoring) appear only as “Phase 2” placeholders.

### Demo tips

- On the `/discover` intro, **“Stakeholder demo: skip ahead with sample answers”** jumps straight to a full report.
- Refreshing resumes exactly where you were.
- **Reset demo data** (footer) clears answers, purchases and progress.
- Checkout is simulated (card / UPI / net banking are all prefilled). The video player runs at an accelerated rate so lessons complete quickly.

## Where things live

- `src/lib/data/` — all dummy content: discovery questions, careers, courses
- `src/lib/scoring.ts` — turns answers into the report (RIASEC scores, archetype, aptitude, matches, learning path)
- `src/lib/store.ts` — localStorage-backed state and actions (`useSyncExternalStore`, hydration-safe)
- `src/components/discover/` — the single-page CDL flow, one component per stage
- `src/components/learn/` — catalogue, course page, video player, checkout

Built with Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Motion and Lucide icons.
