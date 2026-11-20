# Integrations and services

One place for **what we depend on**: how outside services are wrapped in code (part 1), then the services, AWS resources and npm packages themselves (part 2). For why a vendor was chosen, see [../decisions.md](../decisions.md). Keep part 2 current: add a row when a vendor, AWS resource or key package is added.

# Part 1. Wrappers


## Rules
- Modules import `@/integrations/<name>` only. **Never import a vendor SDK from a module.**
- The interface is in **our** terms, not the vendor's (e.g. our `PaymentEvent`, not Razorpay's payload).
- Each wrapper has one real adapter and one `fake` (console/in-memory, for dev and tests). An env var picks the adapter, e.g. `SMS_PROVIDER=fake|msg91`.
- Store vendor references as `provider` + `provider_ref` columns, never vendor-specific columns.
- Do not build a second real adapter until a client actually switches vendor.
- Keep vendor calls in one place. If a service is not in the table below, do not build a wrapper for it until there is a reason; a plain function in `src/integrations/` that holds all calls to that vendor is enough.
- Priority wrappers (likely to swap or risky): `sms`, `payments`, `video`. The others (`storage`, `email`, `analytics`, `queue`) stay small. No extra fakes, tests or docs for them.
- Wrappers make the **code** vendor-independent. They do not carry over client paperwork: DLT templates, payment KYC and domain verification must be redone with a new vendor.

## Layout
```
src/integrations/<name>/
  types.ts     interface + our own types
  fake.ts      dev/test adapter
  <vendor>.ts  real adapter (added with the feature that needs it)
  index.ts     picks adapter from env
```

## Wrappers
| Wrapper | Interface | Today | Swap candidates |
|---|---|---|---|
| `sms` | `sendOtp(phone, code)` | fake, then the client's pick (MSG91 likely) | Gupshup, WhatsApp OTP |
| `payments` | server: `createOrder`, `parseWebhook` → `PaymentEvent`, `getStatus`, `refund`; client: `openCheckout` | Razorpay | Cashfree |
| `video` | `createUpload`, `onEncodeEvent`, `getPlayback` (signed), `getStatus` | S3 + MediaConvert + CloudFront | Mux, VdoCipher, DRM platform |
| `storage` | `uploadUrl`, `downloadUrl` (signed), `remove` | S3 | R2 |
| `email` | `send(template, to, data)`; templates are ours | SES | Mailgun, Resend |
| `analytics` | `track(event, props)`, typed event list, no PII | Mixpanel | PostHog |
| `queue` | `enqueue(job, payload)`, `register(job, handler)` | pg-boss | SQS |

## Dropped
- **`ai` (question rewording, Bedrock):** dropped by [D62](../decisions.md). The quiz uses pre-approved wording variants instead ([../requirements/assessment.md](../requirements/assessment.md)). The prototype folder `src/integrations/ai/` and the `AI_PROVIDER` env switch are unused; remove them in the chat feature.

## Thin facades (not full wrappers)
- **Auth:** `requireUser()`, `requireAdmin()`, `getSession()` in `modules/auth`. The rest of the app never imports Better Auth directly.
- **Errors:** `logger.error()` forwards to Sentry. PII stripping happens in `logger`, in one place.

## Not wrapped (on purpose)
- Drizzle: the module `repo.ts` files are already the boundary.
- Turnstile: the Better Auth captcha plugin switches provider by config.
- PDF: browser print, no vendor (D48).
- Excel export library, video.js player: used in one place; that component is the boundary.
- CRM webhook: an outgoing generic webhook is already provider-neutral.

## Hard rules that apply to every wrapper
- No personal data (phone, email, name, free text) in analytics events or logs.
- `payments.parseWebhook` verifies the signature, and repeated webhooks must not create duplicate orders.

# Part 2. Services, AWS and dependencies

Status values: `not started` · `in progress` · `ready` · `installed`. "Unresearched" means we have not checked current pricing or terms.

## 2.1 Third-party services
| Service | Purpose | Vendor (today) | Wrapper | Owner / account | Status | Cost model |
|---|---|---|---|---|---|---|
| SMS OTP | Login codes | India SMS provider, to choose (MSG91 likely) | `sms` | Client (DLT registration under the client's legal entity) | not started. DLT is the long pole | Per SMS |
| Payments | Hosted checkout, signed webhooks, refunds | Razorpay (Cashfree as alternative) | `payments` | Client's business account | not started. Needs business details, GST status, legal pages | Per-transaction fee. Get written rates |
| Email | Receipt and callback alert | Amazon SES | `email` | AWS account. Needs the final domain | not started. Domain verification and sandbox exit | Per 1,000 emails. Verify current AWS rates |
| Analytics | Funnel events, no PII | Mixpanel, India data residency | `analytics` | Us. Request India access in week 1 | not started. **Pricing and plans unresearched** | Free tier and paid plans. Unresearched |
| Video | Upload, encode, adaptive stream, signed playback | AWS S3 + MediaConvert + CloudFront | `video`, `storage` | AWS account | not started. Week-1 spike with managed-platform fallback | Usage based (see AWS below) |
| Job queue | Background jobs (video status, emails) | pg-boss on our Postgres | `queue` | No external account | installed | None beyond the database |
| Bot check | Stop scripted OTP abuse | Cloudflare Turnstile via the Better Auth captcha plugin | not wrapped | Cloudflare account | not started | Free tier. Verify current terms |
| Error tracking | Crash and error alerts | Sentry (**assumed**; the doc only says "free-tier error tracking") | via the `logger` facade | Us | not started. Wired in week 1 | Free tier |
| Code and CI | Repo, PRs, CI workflow | GitHub, GitHub Actions (our choice; the doc only says "CI builds the image") | none | Kunj's repo (currently public) | workflow written, not run yet | Free for public repos |

## 2.2 AWS resources
All in the Mumbai region `ap-south-1` (D53). Account owner (client's or ours with a later handover) is still open.

| Resource | Used for | Notes |
|---|---|---|
| ECS Express Mode (Fargate) | Web app and worker, same image | One or two small always-on tasks, autoscaling to a low ceiling. Load balancer is a fixed monthly cost |
| Container registry (ECR, **assumed**) | Image storage for deploys | Not named in the docs |
| RDS PostgreSQL 16 | App data and the pg-boss queue | Single zone at first, point-in-time recovery. Revisit when revenue starts |
| S3 | Originals, encoded video, report files | Private, versioning on. Lifecycle moves originals to Glacier Instant Retrieval after 30 days (D59) |
| MediaConvert | Video encoding to several qualities plus thumbnail | Day-1 check that it is available in Mumbai |
| CloudFront | Cached public pages, signed expiring video links | Video delivery is the cost that grows with usage |
| SES | Two transactional emails | Domain verification (DKIM/SPF) and sandbox exit needed |
| Secrets Manager (**assumed** name) | Per-environment keys | The doc says "managed secrets store". Separate keys for dev and production |
| CloudWatch Logs (**assumed**) and Budgets | Logs kept 14 to 30 days, no personal data. Budget alerts at 50%, 80%, 100% | The doc names the retention and alert levels, not the products |
| IAM (**assumed**) | Roles for the app, worker and CI | Not mentioned in the docs |

Cost reference (US East examples from the architecture doc, India rates differ): CloudFront about $0.085 per GB, S3 about $0.023 per GB, MediaConvert about $3.15 per 60-minute video. See [../requirements/architecture.md](../requirements/architecture.md#cost-drivers-and-capacity).

> **Caution (CDN swap):** Cloudflare's terms do not allow video hosted outside Cloudflare (for example in S3) to be served through its Free, Pro or Business CDN, so putting Cloudflare in front of S3 risks a terms violation. If we ever switch to Cloudflare, move the video storage to R2 as well; Cloudflare's CDN may then serve it, and R2 has no egress fee. Re-check the current terms before deciding.

## 2.3 npm dependencies (from `package.json`)

### Runtime (shipped)
| Package | Why we have it |
|---|---|
| `next` 16.4.1, `react` 19.3.0, `react-dom` 19.3.0 | The app: server-rendered pages, server actions and route handlers. Next 16 has breaking changes (read its docs) |
| `drizzle-orm`, `pg` | Typed database access to Postgres |
| `pg-boss` | Job queue on Postgres (worker) |
| `zod` | Validates env config and request input |
| `motion`, `lucide-react` | Animations and icons used by the prototype UI |

### Dev only
| Package | Why |
|---|---|
| `typescript`, `@types/*` | Types |
| `tailwindcss`, `@tailwindcss/turbopack` | Styling and the Turbopack plugin |
| `eslint`, `eslint-config-next` | Lint. `npm audit` flags a dev-only chain here (`braces`); not shipped |
| `prettier`, `prettier-plugin-tailwindcss` | Formatting and class sorting |
| `vitest` | Unit tests |
| `@playwright/test` | Browser tests at phone and desktop size |
| `drizzle-kit` | Generates migrations and runs Drizzle Studio |
| `tsx`, `esbuild` | Run the worker and scripts in dev; bundle them for the image |

### Planned (not installed yet)
Added with the feature that needs them: `better-auth` (login and roles), AWS SDK clients (S3, MediaConvert, CloudFront signing, SES), `razorpay`, `mixpanel`, the Sentry SDK, `video.js` (video player, HLS built in), an Excel export library (to choose), and the Turnstile browser script.

### Gotcha: worker dependencies
The Docker image installs the worker's runtime packages separately (`pg`, `pg-boss`, `zod`, `drizzle-orm`, pinned to the lockfile versions). If worker or migrate code starts importing another package, add it to the list in the `Dockerfile`.

## 2.4 Assumed, not recorded
Sentry, ECR, Secrets Manager, CloudWatch, IAM and GitHub Actions are assumed: the docs describe the need but not the product. Confirm or change them, then record the choice in [../decisions.md](../decisions.md). Tracked in [../open-questions.md](../open-questions.md), together with the client-dependent items that can block go-live (DLT registration, payment account, domain, Mixpanel India access, AWS account owner). Current vendor pricing and free-tier limits are not verified here.
