# Decisions log

One file, newest knowledge wins. `D*` = decisions from the Architecture doc ([requirements/architecture.md](requirements/architecture.md)). `I-*` = decisions from our own interview (Oct 2026) that refine or settle the open items. If an `I-*` entry conflicts with a `D*` entry, `I-*` wins.

To change a decision: edit the row, add a dated note, and update any doc that depends on it.

## Interview decisions (I-*)
| # | Topic | Decision |
|---|---|---|
| I-1 | Repo | Evolve `cdl-prototype` in place; tag `prototype-v0` marks the original demo; keep the current GitHub remote |
| I-2 | API + ORM | Server actions for our own screens; REST route handlers for webhooks, uploads and the worker; both call the module's `service.ts`. ORM: Drizzle with drizzle-kit migrations |
| I-3 | Auth | Better Auth on Drizzle/Postgres: phone-number OTP plugin using our SMS adapter, admin plugin for roles. We build the OTP screens, rate limit and bot check |
| I-4 | Job queue | pg-boss on Postgres; the worker is the same image with a different start command. Replaces the doc's SQS |
| I-5 | AI wording | Live AI rewording of fixed questions; per-user daily cap, total spend cutoff, contract excludes training on our data; fallback to the original wording on any failure |
| I-6 | Typed input | Only the name is typed: max 30 chars, letters only, with a self-harm and abuse word check. Everything else is quick-tap |
| I-7 | Careers | The careers part of the report (see I-20): top RIASEC interest areas plus example career families. No salary, no % fit |
| I-8 | PDF | Browser print-to-PDF: print stylesheet on the report page plus a "Download PDF" button. No server rendering. Supersedes the doc's server-side PDF |
| I-9 | Video | AWS S3 + MediaConvert + CloudFront behind the `video` wrapper. Week-1 checkpoint; managed-platform fallback (D20) |
| I-10 | Admin | Custom minimal: courses (lessons, upload, quiz, price, publish), users and purchases, leads (Excel export), manual access grant |
| I-11 | Analytics | Mixpanel with India data residency (request access in week 1; region is fixed per project). Fallback: PostHog EU with session replay off. ⚠️ Research plans and pricing before signup |
| I-12 | PWA | Manifest, icons and theme colour only (`app/manifest.ts`). No service worker or offline mode in Phase 1 |
| I-13 | AWS region | Mumbai `ap-south-1`. Day-1 check: MediaConvert and ECS Express Mode available |
| I-14 | Bot check | Cloudflare Turnstile (invisible) through the Better Auth captcha plugin on OTP send, plus rate limits: per number per day, per IP per hour, resend cooldown |
| I-15 | Email | Amazon SES (Mumbai). Only 2 emails in Phase 1: payment receipt, callback alert. Needs the final domain (DKIM/SPF) and a sandbox-exit request |
| I-16 | AI provider | Claude Haiku on AWS Bedrock (own AWS account; no training on prompts by default). Day-1 check: Mumbai direct vs APAC cross-region routing. Used only for rewording (see I-5, I-20) |
| I-17 | SMS | Provider-agnostic `sms` wrapper; adapter picked by env var (`fake` in dev). Client picks the provider (MSG91 likely). DLT registration is a client task, start week 1 |
| I-18 | Chat timeout | `CHAT_INACTIVITY_MINUTES`, default 30, client can tune it. Only fires `chat_exited`; the user can still resume |
| I-19 | Original videos | S3 lifecycle rule moves originals to Glacier Instant Retrieval after 30 days |
| I-20 | Assessment | About 25 quick-tap questions: basics (name, age, studying or working, goal), then **OCEAN** personality, then **RIASEC** interests. Both scored by fixed rules, never by the AI. Report: OCEAN gives strengths and growth areas; RIASEC gives interest areas, career families and suggested courses. The AI only rewords questions |
| D-0 | Day 0 | Shared Claude config is committed; Docker Postgres locally; skeleton plus fake adapters on day 0; no branch protection (team follows branch + PR + green CI); repo visibility is Kunj's call (currently public) |

## Architecture-doc decisions (D*)
See the table in [requirements/architecture.md](requirements/architecture.md#decisions-made). The ones that shape daily work:

- **D15** modular monolith, managed Postgres, object storage, job queue.
- **D17** products, orders and entitlements live in our own database (orders ≠ entitlements).
- **D18** no raw chat text stored; journey tracked by stage, message number, input type, exit point.
- **D35/D36** fixed-question guided chat, no open text box (see I-6 for the one exception, the name).
- **D40** no DRM at launch; signed expiring links plus a viewer watermark.
- **Age** asked in the chat only; no gate in Phase 1 (client's choice, lawyer review recommended).

## Pending / flagged
Tracked in [open-questions.md](open-questions.md).
