# Modules and boundaries

One Next.js app serves the pages **and** the API (monolith, one repo). A worker process runs from the same codebase and image. 

## Folder layout
```
src/
  app/
    (public)/   home, /learn, /learn/[slug], legal pages   server-rendered, cached
    (learner)/  /discover, /my-self/*                      session required
    (admin)/    /admin/*                                   admin role (added with the admin feature)
    api/        REST handlers: webhooks, uploads, worker callbacks
  modules/<name>/
    service.ts   public interface; the ONLY thing other modules may import
    repo.ts      DB queries (private)
    schema.ts    Drizzle tables
    actions.ts   server actions for our own screens (thin; call service.ts)
    *.test.ts
    (create each file when the feature needs it, not before)
  integrations/<name>/   types.ts · fake.ts · <vendor>.ts · index.ts   (see integrations.md)
  components/    ui/ kit + feature folders
  config/        brand.ts
  lib/           env, db, logger, session helpers, format (generic helpers only)
  db/schema.ts   re-exports every module schema for drizzle-kit
worker/          pg-boss consumer (video status, emails)
drizzle/         generated migrations
docs/            this folder
```

Modules are created when their first feature lands. Chat data (question sets, scoring rules) lives inside `modules/chat`, not in `lib/` or `config/`.

## Modules
Five modules, each owning its data. Admin and analytics are not modules: admin is pages under `app/(admin)/` that call the other modules' services, and analytics is the `track()` call on the analytics integration.

| Module | Owns | Outside dependency (via wrapper) |
|---|---|---|
| `auth` | OTP login, sessions, learner profile (name, number, optional email), roles | `sms` |
| `chat` | Meera flow, OCEAN and RIASEC question sets as versioned config, answers, scoring rules, report | `ai` (wording only) |
| `catalog` | Courses, lessons, quiz questions, prices, bundles, publish state. Inside it: `video/` (upload, encoding jobs, status, thumbnails) and `learning/` (playback authorisation, progress and resume, quiz marking) | `video`, `storage`, `queue` |
| `commerce` | Products, orders, payments, entitlements, receipts, manual access grant | `payments`, `email` |
| `leads` | Callback requests, consent flag, instant email alert, Excel export, webhook | `email` |

Split a file when it passes about 300 lines; do not pre-split.

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
