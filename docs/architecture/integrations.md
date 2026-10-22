# Integrations: third-party wrappers

Loaded into every Claude session (imported from `CLAUDE.md`). Keep it short.

## Rules
- Modules import `@/integrations/<name>` only. **Never import a vendor SDK from a module.**
- The interface is in **our** terms, not the vendor's (e.g. our `PaymentEvent`, not Razorpay's payload).
- Each wrapper has one real adapter and one `fake` (console/in-memory, for dev and tests). An env var picks the adapter, e.g. `SMS_PROVIDER=fake|msg91`.
- Store vendor references as `provider` + `provider_ref` columns, never vendor-specific columns.
- Do not build a second real adapter until a client actually switches vendor.
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
| `ai` | `rewordQuestion(input)` → text; falls back to the original wording on error, cap or timeout | Bedrock (Claude Haiku) | OpenAI, Gemini |
| `email` | `send(template, to, data)`; templates are ours | SES | Mailgun, Resend |
| `analytics` | `track(event, props)`, typed event list, no PII | Mixpanel | PostHog |
| `queue` | `enqueue(job, payload)`, `register(job, handler)` | pg-boss | SQS |

## Thin facades (not full wrappers)
- **Auth:** `requireUser()`, `requireAdmin()`, `getSession()` in `modules/auth`. The rest of the app never imports Better Auth directly.
- **Errors:** `logger.error()` forwards to Sentry. PII stripping happens in `logger`, in one place.

## Not wrapped (on purpose)
- Drizzle: the module `repo.ts` files are already the boundary.
- Turnstile: the Better Auth captcha plugin switches provider by config.
- PDF: browser print, no vendor (I-8).
- Excel export library, hls.js player: used in one place; that component is the boundary.
- CRM webhook: an outgoing generic webhook is already provider-neutral.

## Hard rules that apply to every wrapper
- No personal data (phone, email, name, free text) in analytics events or logs.
- The `ai` wrapper receives only the fixed question text and light context (first name); it never sees scores or answers, and never makes decisions.
- `payments.parseWebhook` verifies the signature, and repeated webhooks must not create duplicate orders.
