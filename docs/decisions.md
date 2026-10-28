# Decisions log

One numbered list, `D1`–`D63`. `D1`–`D40` come from the Architecture doc ([requirements/architecture.md](requirements/architecture.md)). `D41`–`D63` were made in our own interview (Oct 2026; they were numbered `I-1`–`I-20` and `D-0` before the cleanup). If two decisions conflict, the higher number wins.

To change a decision: edit the row, add a dated note, and update any doc that depends on it.

## Interview decisions (D41–D63)
| # | Topic | Decision |
|---|---|---|
| D41 | Repo | Evolve `cdl-prototype` in place; tag `prototype-v0` marks the original demo; keep the current GitHub remote |
| D42 | API + ORM | Server actions for our own screens; REST route handlers for webhooks, uploads and the worker; both call the module's `service.ts`. ORM: Drizzle with drizzle-kit migrations |
| D43 | Auth | Better Auth on Drizzle/Postgres: phone-number OTP plugin using our SMS adapter, admin plugin for roles. We build the OTP screens, rate limit and bot check |
| D44 | Job queue | pg-boss on Postgres; the worker is the same image with a different start command. Replaces the doc's SQS |
| D45 | AI wording | ~~Live AI rewording of fixed questions; per-user daily cap, total spend cutoff, contract excludes training on our data; fallback to the original wording on any failure~~ **Superseded by D62 (Oct 26, 2026)** |
| D46 | Typed input | Only the name is typed: max 30 chars, letters only, with a self-harm and abuse word check. Everything else is quick-tap |
| D47 | Careers | The careers part of the report (see D60): top RIASEC interest areas plus example career families. No salary, no % fit |
| D48 | PDF | Browser print-to-PDF: print stylesheet on the report page plus a "Download PDF" button. No server rendering. Supersedes the doc's server-side PDF |
| D49 | Video | AWS S3 + MediaConvert + CloudFront behind the `video` wrapper. Week-1 checkpoint; managed-platform fallback (D20) |
| D50 | Admin | Custom minimal: courses (lessons, upload, quiz, price, publish), users and purchases, leads (Excel export), manual access grant |
| D51 | Analytics | Mixpanel with India data residency (request access in week 1; region is fixed per project). Fallback: PostHog EU with session replay off. ⚠️ Research plans and pricing before signup |
| D52 | PWA | Manifest, icons and theme colour only (`app/manifest.ts`). No service worker or offline mode in Phase 1 |
| D53 | AWS region | Mumbai `ap-south-1`. Day-1 check: MediaConvert and ECS Express Mode available |
| D54 | Bot check | Cloudflare Turnstile (invisible) through the Better Auth captcha plugin on OTP send, plus rate limits: per number per day, per IP per hour, resend cooldown |
| D55 | Email | Amazon SES (Mumbai). Only 2 emails in Phase 1: payment receipt, callback alert. Needs the final domain (DKIM/SPF) and a sandbox-exit request |
| D56 | AI provider | Claude Haiku on AWS Bedrock (own AWS account; no training on prompts by default). Day-1 check: Mumbai direct vs APAC cross-region routing. Used only for rewording (see D45, D60). **Superseded by D62: no AI provider in Phase 1** |
| D57 | SMS | Provider-agnostic `sms` wrapper; adapter picked by env var (`fake` in dev). Client picks the provider (MSG91 likely). DLT registration is a client task, start week 1 |
| D58 | Chat timeout | `CHAT_INACTIVITY_MINUTES`, default 30, client can tune it. Only fires `chat_exited`; the user can still resume |
| D59 | Original videos | S3 lifecycle rule moves originals to Glacier Instant Retrieval after 30 days |
| D60 | Assessment | About 25 quick-tap questions: basics (name, age, studying or working, goal), then **OCEAN** personality, then **RIASEC** interests. Both scored by fixed rules, never by the AI. Report: OCEAN gives strengths and growth areas; RIASEC gives interest areas, career families and suggested courses. ~~The AI only rewords questions~~ (see D62) |
| D61 | Day 0 | Shared Claude config is committed; Docker Postgres locally; skeleton plus fake adapters on day 0; no branch protection (team follows branch + PR + green CI); repo visibility is Kunj's call (currently public) |
| D62 | Assessment variants | No AI in the quiz. Each fixed question ID has 2 to 3 pre-approved variants (same meaning and polarity), picked per session by a deterministic hash. Answers are stored as question ID + variant ID + value; scoring ignores the variant. ~26 questions: 4 basics, 10 OCEAN (IPIP style, public domain), 12 RIASEC (our own items, not validated). Supersedes D45, D56 and the rewording part of D60. Details: [requirements/assessment.md](requirements/assessment.md) |
| D63 | Chat flow | OTP before the quiz. Every start creates an attempt; all attempts kept, report shows the latest completed. Each tap saved by a server action (resume, exit point). Name lives in the auth profile; other basics are answers on the attempt. Callback request is a separate `leads` feature. Courses in the report come from `catalog.coursesForInterests`, using a `riasec_types` field on courses. Details: [specs/chat.md](specs/chat.md) |

## Architecture-doc decisions (D1–D40)
See the table in [requirements/architecture.md](requirements/architecture.md#decisions-made). The ones that shape daily work:

- **D15** modular monolith, managed Postgres, object storage, job queue.
- **D17** products, orders and entitlements live in our own database (orders ≠ entitlements).
- **D18** no raw chat text stored; journey tracked by stage, message number, input type, exit point.
- **D35/D36** fixed-question guided chat, no open text box (see D46 for the one exception, the name).
- **D40** no DRM at launch; signed expiring links plus a viewer watermark.
- **Age** asked in the chat only; no gate in Phase 1 (client's choice, lawyer review recommended).

## Pending / flagged
Tracked in [open-questions.md](open-questions.md).
