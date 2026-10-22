# SELF

Mobile-first career discovery + learning platform. Learners chat with Meera (free), get a report, and buy self-paced courses. One Next.js app (pages + API), a background worker, and a Postgres database, all in this repo. "SELF" is a working name.

> The original clickable UI prototype is kept at git tag `prototype-v0` (and live at cdl-prototype.vercel.app).

## Run it locally

Needs Node 22 (`nvm use` reads `.nvmrc`) and Docker.

```bash
nvm use
npm install
cp .env.example .env        # fake values, safe for dev
docker compose up -d --wait # Postgres 16 on localhost:5433
npm run db:migrate
npm run dev                 # http://localhost:3000
npm run worker              # background jobs (separate terminal)
```

In dev every outside service (SMS, payments, video, AI, email, analytics) uses a **fake** adapter: OTP codes and emails are printed to the console. No keys needed.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` / `build` / `start` | Next.js app |
| `npm run lint` / `typecheck` / `format` / `format:check` | Code quality |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser smoke tests (Playwright, 375px phone + desktop). Needs `npx playwright install chromium` once |
| `npm run db:generate` / `db:migrate` / `db:seed` / `db:studio` | Drizzle migrations and data |
| `npm run worker` | Background worker (pg-boss) |
| `npm run build:worker` | Bundles the worker and migrate scripts to `dist/` for the container |

## Docker image

One image, three entrypoints:

```bash
docker build -t self-app .
docker run -p 3000:3000 self-app                                   # web
docker run self-app node /worker/dist/worker.js                    # worker
docker run -w /worker self-app node dist/migrate.js                # migrations
```

## Docs

Start with `CLAUDE.md` (rules for working in this repo, including with Claude Code).

- [docs/decisions.md](docs/decisions.md): every decision (architecture doc `D*`, our interview `I-*`)
- [docs/architecture/modules.md](docs/architecture/modules.md): the 9 modules and boundary rules
- [docs/architecture/integrations.md](docs/architecture/integrations.md): third-party wrappers
- [docs/design/design-system.md](docs/design/design-system.md): tokens, patterns, mobile rules
- [docs/prototype/reuse-map.md](docs/prototype/reuse-map.md): what to keep from the prototype
- [docs/requirements/](docs/requirements/): scope of work and architecture source docs
- [docs/specs/_template.md](docs/specs/_template.md): write a spec before building a feature
- [docs/open-questions.md](docs/open-questions.md): flags and client inputs

## Working agreement

Work on a branch, open a PR, merge to `main` only when CI is green. Write the spec first (`/feature-spec` in Claude Code), keep modules talking only through `service.ts`, and never put personal data in logs or analytics.
