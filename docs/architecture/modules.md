# Modules and boundaries

One Next.js app serves the pages **and** the API (monolith, one repo). A worker process runs from the same codebase and image. Nine modules, each owning its data.

## Folder layout
```
src/
  app/
    (public)/   home, /learn, /learn/[slug], legal pages   server-rendered, cached
    (learner)/  /discover, /my-self/*                      session required
    (admin)/    /admin/*                                   admin role
    api/        REST handlers: webhooks, uploads, worker callbacks
  modules/<name>/
    service.ts   public interface; the ONLY thing other modules may import
    repo.ts      DB queries (private)
    schema.ts    Drizzle tables
    actions.ts   server actions for our own screens (thin; call service.ts)
    *.test.ts
  integrations/<name>/   types.ts · fake.ts · <vendor>.ts · index.ts   (see integrations.md)
  components/    ui/ kit + feature folders
  config/        brand.ts, question-sets/v1/*.json, scoring rules
  lib/           env, db, logger, session helpers, format
  db/schema.ts   re-exports every module schema for drizzle-kit
worker/          pg-boss consumer (video status, emails)
drizzle/         generated migrations
docs/            this folder
```

## Modules
| Module | Owns | Outside dependency (via wrapper) |
|---|---|---|
| `auth` | OTP login, sessions, learner profile (name, number, optional email), roles | `sms` |
| `chat` | Meera flow, OCEAN and RIASEC question sets as versioned config, answers, scoring rules, report | `ai` (wording only) |
| `catalog` | Courses, lessons, videos, PDFs, quiz questions, prices, bundles, publish state | `storage` |
| `commerce` | Products, orders, payments, entitlements, receipts, manual access grant | `payments`, `email` |
| `learning` | Playback authorisation, progress and resume, quiz marking | `video` (signed access) |
| `video` | Upload, encoding jobs, status and retries, thumbnails | `video`, `storage`, `queue` |
| `leads` | Callback requests, consent flag, instant email alert, Excel export, webhook | `email` |
| `admin` | Course management, users and purchases, leads list, audit log | none (uses other services) |
| `analytics` | Funnel events for each step | `analytics` |

## Boundary rules
1. Modules talk to each other **only through `service.ts`**. Never import another module's `repo`, `schema` or `actions`.
2. Route handlers and server actions are thin: validate input (zod), check the session/role, call a service, return.
3. Business logic lives in `service.ts`; DB access lives in `repo.ts`.
4. Scoring is a **pure function** in `modules/chat`, unit-tested, and never uses the AI.
5. Orders and entitlements are separate: what a user bought is not what they may access (bundles, manual grants, future seats).
6. Only the `auth` module touches Better Auth; everyone else calls `requireUser()` / `requireAdmin()` / `getSession()`.

## Server actions vs REST handlers
- **Server actions**: calls from our own screens (e.g. "request callback", "answer question").
- **REST handlers**: anything called from outside our own pages (payment webhook, MediaConvert callback, resumable upload, worker).
- Both call the same `service.ts`, so the logic is written once.

## Rendering
Public pages (home, catalog, course) are server-rendered and cacheable. Interactive parts (ownership state, player, checkout button, chat) are small client islands. The Next.js version here (16.x) has breaking changes: read `node_modules/next/dist/docs/` before writing Next code (see `AGENTS.md`).
