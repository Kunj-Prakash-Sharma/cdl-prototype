# Decisions log

One numbered list, `D1`–`D70`. `D1`–`D40` come from the Architecture doc ([requirements/architecture.md](requirements/architecture.md)). `D41`–`D70` were made in our own interview (Oct 2026; they were numbered `I-1`–`I-20` and `D-0` before the cleanup). If two decisions conflict, the higher number wins.

To change a decision: edit the row, add a dated note, and update any doc that depends on it.

## Interview decisions (D41–D70)
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
| D64 | Auth rules | India +91 only; login before chat, before buying and for any video, including the free first lesson (home and course pages open); 30-day session; returning users see the report and can retake; OTP 6 digits, 5 min, 5 tries, 15 min lock; limits 30 s resend, 5/number/day, 10/IP/hour; bot-check failure shows "Try again"; name editable, phone change needs a new OTP; admins by phone allow-list; terms tick once legal pages exist; temporary fixed code for allow-listed invited numbers if DLT is late; data deletion manual; actions return typed `{ok, code}` results, never throw for expected cases. Details: [specs/auth.md](specs/auth.md). *Nov 2, 2026: "phone only" is replaced by D65; "free first lesson needs login" is replaced by D66.* |
| D65 | Login identifier | Nov 2, 2026. A learner can log in with a **phone number or an email**, using the same OTP method. Replaces "+91 phone only" in D64. **Spec needed later** (email OTP through SES, one account per person if both are used, rate limits). Not built: phone OTP stays until that spec is done |
| D66 | Free previews | Nov 2, 2026. Free lecture previews need **no login**. Login stays required for the chat, buying and paid videos. Replaces the "free first lesson needs login" part of D64. Previews use a per-lesson `preview` flag; preview analytics use an anonymous session id (no per-person stop point). Client has not confirmed this yet |
| D67 | Sample content | Nov 2, 2026. We do not wait for the client's courses. Build and demo with sample videos (YouTube or other free samples) behind the `video` wrapper; real courses replace them later |
| D68 | Question pool and IDs | Nov 2, 2026. A 50-question pool (25 personality, 25 interests; draft at first, approved by the client Nov 3, see D69) is the source. Each quiz version asks a chosen subset. Personality = rewrites of IPIP markers (public domain). Interests = rewrites of ORVIS activities from the IPIP site (public domain; confirmed from the source paper Nov 3, 2026). Question IDs freeze once a real learner answer is stored; until then draft sets may be re-numbered. **Nothing that can change (question count, IDs, stage names, wording, scale labels, report copy) is hardcoded in the UI**: it all comes from the question set. Replaces the "interest items are our own" part of D62. Details: [requirements/item-sources.md](requirements/item-sources.md) |
| D69 | Client approval of the question bank | Nov 3, 2026. The client approved the 50-question sample bank (wording as on the sample page we sent), the scoring cut-offs, the "Balanced" middle-band cards and card style B (strength-or-balance note plus tip for every band, with a "Try this first" line). One change: personality answer labels become **Not at all me, A little like me, Somewhat like me, Mostly me, Exactly me**; the interest labels follow the same even steps (**Not at all, A little, Somewhat, Quite a lot, A lot**; the client's note named personality only, to confirm). **Quiz length (decided later the same day): 10 personality + 12 interests, 2 per trait or type** (plus the basics), picked from the pool; the other pool questions stay in reserve. Each live question gets **3 wordings (variants)**: the approved pool wording is variant 1, variants 2 and 3 are drafted by us (same meaning, same direction) and shown to the client before launch. The ORVIS licence is confirmed (public domain per the source paper). The footer wording is temporary until the client and a lawyer confirm it. Confirms the 10 + 12 plan of D62 and keeps its 3-variant rule; the pool replaces our own earlier draft wording |
| D70 | Distress safety and the name check | Nov 3, 2026. A **helpline link is always visible** on every chat screen, on the stop screen and on the report; its wording, number and link are data in `src/config/helpline.ts` (placeholder until the client supplies them). The **name check is the backup**: a self-harm phrase shows the stop screen with the same helpline and ends the attempt; an abuse word only asks for a real name again (no helpline, the attempt stays open, because a real name can collide with an abuse word). Names may use Latin, nine Indian scripts and Arabic (Urdu), one script per word, and are saved in NFKC form. The Hindi/Hinglish blocklist is **temporary**: abuse words come from the LDNOOBW list (CC BY 4.0, credit required), the self-harm phrases are our own and unreviewed, and regional languages are not covered; the client supplies the real list. Extends D46 |

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
