# SELF Phase 1 – Architecture and Technical Decisions

Source: "SELF Phase 1 – Architecture and Technical Decisions.pdf", Oct 21, 2026, Kunj Sharma. Converted to markdown for repo use. Our own interview decisions that refine this doc are in [../decisions.md](../decisions.md) (I-1…I-20). Where they differ, `decisions.md` wins.

## Summary
Phase 1 is one modular web application on AWS (India region), with managed services for video, payments, SMS and AI. It goes to invited users around 22 November 2026, and that date can move by one to two weeks. It covers Level 0 (the free guided career chat with Meera) and Level 1 (self-paced courses), plus a learner dashboard and an admin panel. Live sessions (Level 2) follow around 6 December.

Constraints:
- **Team:** two developers and a lead architect who also does the design.
- **Time:** about four weeks of build, with Diwali holidays (6 to 10 November) inside it.
- **Audience:** young users, many under 18, mostly on phones. The client chose no age gate for Phase 1, and we recommend a lawyer reviews this.
- **Traffic:** 100 to 500 invited users at first. We size for 10,000 visitors a month, with spikes after influencer posts.
- **Stack:** TypeScript end to end (a React framework with server-rendered public pages, a Node.js backend, PostgreSQL).

## At a glance
One modular app does the work, and every part that is not the client's own product logic is bought in.

```
Browsers (learners, admin)
   │
CloudFront (cached public pages, signed video links)
   │
App on ECS Express Mode — one deployable app, nine modules:
   Auth, chat, catalog, commerce, learning, video, leads, admin, analytics
   │            │                 │
   │            └─ job queue ─ worker (video, PDF, email jobs) ─ MediaConvert ─ S3
   └─ Managed PostgreSQL with backups
Outside services the app calls: SMS (OTP), Payments, AI (wording), Email (receipts), Analytics (events)
All inside the AWS India region.
```

Browsers reach the app through CloudFront. The app calls the outside services, and payment webhooks come back to it. Admin uploads go straight to S3, a worker starts MediaConvert, and learners stream the encoded video from S3 through CloudFront with signed links.

## Decisions made
| ID | Decision | Status |
|---|---|---|
| D4 | Custom app on managed building blocks for video, payments, SMS, email and AI | Decided |
| D11 | Mobile-first responsive website, ready to become a PWA later | Decided |
| D12 | One codebase with pre-rendered public pages, simple CMS in Phase 2 | Decided |
| D15 | Modular monolith on managed PostgreSQL, managed object storage and a job queue | Decided |
| D16 | Phone OTP by SMS through an India-focused provider behind an interface. Start DLT registration now | Decided |
| D17 | Products, orders and entitlements owned by our own database | Decided |
| D18 | No raw chat text stored. Journey tracked by stage, message number, input type and exit point. A text-retention switch is built in but off | Decided, client to confirm |
| D19 | Payment gateway behind an interface. Onboard Razorpay and Cashfree, default Razorpay | Decided |
| D20 | Video on AWS (S3, MediaConvert, CloudFront) behind a video interface. Fall back to a managed platform if no test video plays end to end by the end of week 1 | Decided |
| D21 | Leads table with consent flag, admin list with Excel export, instant email alert, webhook for a later CRM | Decided |
| D22 | One AI provider behind an interface, chosen after a short comparison | Decided, provider open (now: Bedrock Haiku, I-16) |
| D23 | AWS India region, app on ECS Express Mode, managed database | Decided, pending confirmation |
| D24 | Dev and production only. Dev doubles as staging, with guardrails | Decided |
| D25 | Lean autoscaling with caps, rate limits and spend limits | Decided |
| D26 | Lean safety net: point-in-time backups, error tracking, uptime checks, budget alerts | Decided |
| D35, D36 | Fixed-question guided chat with no open text box. OCEAN for personality and RIASEC for interests, scored by fixed rules | Decided |
| D40 | No DRM at launch. Signed expiring links and a viewer watermark | Decided |
| Age | Age is asked inside the chat only. No gate, notice or marketing messages in Phase 1 | Client's choice, legal review recommended |

## Modules
The backend is one deployable app with nine modules. Each module owns its data and talks to others through code interfaces, so Level 2 and B2B can be added without a rewrite.

| Module | Owns | Outside dependency |
|---|---|---|
| Auth and accounts | OTP login, sessions, learner profile (name, number, optional email), roles | SMS provider |
| Chat and assessment | Meera flow, OCEAN and RIASEC question sets as versioned config, answers, scoring rules, report (web and PDF) | AI provider (wording only), PDF rendering |
| Catalog and content | Courses, lessons, videos, PDFs, quiz questions, prices, bundles, publish state | S3 |
| Commerce and access | Products, orders, payments, entitlements, receipts, manual access grant | Payment gateway, email |
| Learning | Playback authorisation, progress and resume, quiz marking | CloudFront signed access |
| Video pipeline | Upload, encoding jobs, status and retries, thumbnails | S3, MediaConvert |
| Leads | Callback requests, consent flag, instant email alert, Excel export, webhook | Email provider |
| Admin | Course management, users and purchases, leads list | None |
| Analytics | Funnel events for each step | Analytics tool |

## Key flows

### 1. Career chat and report
1. The visitor taps Start and enters a phone number. The server rate-limits and bot-checks the request, then sends an OTP by SMS.
2. After OTP, the server creates or finds the learner and starts a chat session with a pseudonymous session ID.
3. Meera serves about 25 fixed questions from versioned config. The AI provider only rewords each question. The answer is stored against the fixed question ID.
4. A funnel event is sent for every step: stage, message number and input type. No chat text is stored.
5. After the last answer, fixed scoring rules compute the OCEAN and RIASEC scores and the report is saved to the account.
6. The report page offers suggested courses, save, PDF download and a callback request. A callback saves a lead with its consent flag and sends an instant email to the team.

### 2. Purchase and access
1. The learner opens a course page. The first lesson plays as a free preview, and the rest is locked.
2. Checkout creates an order for a product (a course or a bundle) and opens the gateway.
3. The gateway calls our webhook. The server verifies the signature, marks the order paid, creates the entitlements and sends the receipt email.
4. If the gateway is late or the payment was offline, an admin grants the entitlement by hand.

### 3. Video upload and playback
1. An admin uploads a video from the browser straight to a private S3 bucket (resumable upload).
2. The upload triggers a MediaConvert job that outputs several qualities (adaptive streaming) and a thumbnail. The pipeline records job status and retries failures.
3. The learner's player asks the server for access. The server checks the entitlement and returns signed, expiring access to CloudFront.
4. The player shows the learner's ID as a faint watermark and reports progress back, so "resume where I left" works.

## Data model
The model separates what a user bought (orders) from what a user may access (entitlements), so bundles, manual grants and future Level 2 seats need no redesign. Fourteen entities cover Phase 1.

| Entity | Purpose | Key fields |
|---|---|---|
| Learner | The account holder | id, phone, name, optional email, role, consent flags, created date |
| Chat session | One run of the Meera chat | pseudonymous id, learner id (after OTP), stage reached, last message number, started and ended times |
| Chat answer | One structured answer | session id, fixed question id, value, input type, time taken |
| Assessment result | Scores from fixed rules | learner id, framework (OCEAN or RIASEC), question set version, scores |
| Report | The saved report | learner id, result ids, strengths, interests, suggested course ids |
| Course and lesson | Catalog content | title, category, description, price, maximum discount, status, lesson order, preview flag |
| Video | An uploaded video | S3 key, encoding status, renditions, duration, thumbnail |
| Quiz question | Multiple-choice check | lesson id, question, options, correct option |
| Product and bundle | What can be sold | type (course or bundle), price, included course ids |
| Order | A purchase attempt | learner id, product id, amount, status, gateway references |
| Entitlement | Right to access | learner id, course id, source (purchase or manual), granted by, optional expiry |
| Progress | Learning position | learner id, lesson id, position, completed flag |
| Lead | Callback request | learner id, report id, phone, consent flag, status, created date |
| Audit log | Admin actions | actor, action, target, time |

## Integrations
Every outside service sits behind our own interface, so a provider can change without touching the modules. Three have lead times that can delay go-live: SMS registration, the payment account and the sender domain.

| Capability | Provider | Interface rule | Lead time and risk |
|---|---|---|---|
| SMS OTP | India-focused SMS provider, to choose | One send-OTP interface. WhatsApp can be added later | DLT registration needs the legal entity and sender name. Confirm timing with the provider |
| Payments | Razorpay or Cashfree, default Razorpay | One gateway interface. Signed webhooks. Repeated webhooks never create duplicate orders | Merchant onboarding needs the client's business details and GST status. Manual access is the fallback |
| Video | AWS S3, MediaConvert, CloudFront | One video interface, so a managed platform can replace it | Week-1 checkpoint. Check MediaConvert availability in the chosen India region |
| AI wording | One hosted AI API, to choose | One provider-agnostic interface. Fixed question IDs. Contract must exclude training on our data | Short comparison on wording quality, cost, data terms and data location |
| Email | Transactional email provider, to choose | Templates for receipts and callback alerts | Sender domain setup needs the final domain, which is not decided yet |
| Analytics | Mixpanel-style tool, to choose | One event wrapper. No personal data in events. No ad pixels | Low |
| PDF report | Server-side PDF rendering | Same report template as the web page | Extra build time. First item to move to Phase 2 if the date slips. **(Superseded: browser print, I-8)** |

## Infrastructure and environments
Everything runs in one AWS account in an India region, using managed services only and no Kubernetes. The app runs on Amazon ECS Express Mode because AWS App Runner is closed to new customers, and AWS recommends Express Mode as the replacement.

| Layer | Choice | Notes |
|---|---|---|
| Region | AWS India region, Mumbai or Hyderabad | Keeps data in India. Check that MediaConvert is available in the region we pick |
| App hosting | ECS Express Mode (containers on Fargate) | One call creates the service, load balancer and autoscaling, with no extra charge for Express Mode itself. It needs a container image, so CI builds one. The load balancer is a fixed monthly cost |
| Database | Managed PostgreSQL, single zone at first, with point-in-time recovery | A single zone accepts a short outage if that data center fails. Revisit when revenue starts |
| Storage | S3 private buckets for originals, encoded video, reports and PDFs, with versioning on | Originals are kept so we can re-encode later |
| Delivery | CloudFront | Public pages cached. Signed, expiring access for video |
| Jobs | Managed queue with a worker | Video jobs, PDF reports and emails. **(Now: pg-boss, I-4)** |
| Secrets | Managed secrets store | Separate keys per environment |
| CI/CD | Build the image once. Deploy to dev on merge to main after tests pass | Production needs manual approval and has one-step rollback |
| Environments | Dev and production. Dev doubles as staging | Dev uses test-mode payment keys, demo videos and dummy accounts, with no real personal data. Separate database, buckets and keys, ideally separate AWS accounts. Freeze deploys before client reviews |
| Scaling | One or two small always-on tasks, autoscaling to a low ceiling | Rate limits and a bot check before OTP and AI calls. A per-user daily AI cap and a total spend cutoff. One short load test before launch. Ask the client for notice before big campaigns |
| Backups and monitoring | Point-in-time recovery, versioned originals, restore test before launch and then quarterly | Free-tier error tracking and uptime checks, one alert channel, budget alerts at 50%, 80% and 100%. Logs kept 14 to 30 days with no personal data or message content |

We add a real staging environment when three or more developers work in parallel, when the client starts testing during active development, or when Phase 2 adds live sessions and more payment flows.

## Security, privacy and compliance

### Controls we build
- **Login abuse:** rate limits and a bot check before every OTP, and a daily cap on OTPs per number.
- **AI abuse and cost:** the AI only rewords fixed questions, with a per-user daily cap and a total spend cutoff. Scoring uses fixed rules and never the AI.
- **Data minimisation:** no raw chat text, no ad pixels, and no personal data in analytics events or logs.
- **Consent:** the callback tick-box is stored as a consent flag with a time. No marketing messages in Phase 1.
- **Content protection:** signed, expiring video access checked against entitlements, plus a viewer watermark. No DRM at launch.
- **Payments:** card data never touches our servers. Webhooks are signature-checked and safe to repeat.
- **Admin:** roles, an audit log of admin actions, and no shared logins.
- **Sensitive words:** if any typed field contains self-harm words, show a helpline link and stop the chat. The helpline and wording need the client's approval.

### For the client's lawyer
- Children's data and parental consent under the Digital Personal Data Protection Act, 2023 and its Rules.
- Privacy policy, terms and refund pages, which a payment account usually needs before activation.
- Retention periods for answers, scores, leads and logs, and deletion on request.
- Wording of the report as guidance, not a medical or psychological result.
- Telecom rules for SMS and callback calls (TRAI, DLT registration).

These are named for risk management only. Applicability has to be confirmed by the client's counsel, and we are not giving legal advice.

## Analytics events
Every funnel step sends one event under a pseudonymous session ID. Events carry no names, phone numbers or free text.

| Event | When it fires | Key properties |
|---|---|---|
| home_viewed | Home page opens | traffic source, device type |
| chat_started | User taps Start career discovery | source |
| otp_sent, otp_verified | OTP requested and confirmed | result, attempt number |
| chat_step | Each Meera question is answered | stage, message number, input type, seconds taken |
| chat_exited | Session goes quiet for the agreed timeout | last stage, last message number |
| report_viewed | Report opens | scores present, courses suggested |
| report_action | Save, PDF, callback or courses tapped | action |
| course_viewed, preview_played | Course page opens, free lesson plays | course id |
| checkout_started, payment_succeeded, payment_failed | Checkout steps | product id, amount, gateway result |
| lesson_completed | Lesson finished | course id, lesson id |

The inactivity timeout that counts a session as "lost" was still to be agreed. **(Now: config, default 30 min, I-18)**

## Cost drivers and capacity
Video delivery is the cost that grows with usage; storage is small. Figures are from AWS's published example in US East at default settings. India rates differ.

| Driver | AWS example | At our scale (3,000 minutes of video) |
|---|---|---|
| Delivery (CloudFront) | 0.75 MB/s per viewer, 2,700 GB per 1,000 viewer-hours, about $229.50 at $0.085 per GB | 1,000 viewer-hours a month is about 2.7 TB, about $230 at that rate |
| Storage (S3) | At most 9 GB per 60-minute video at $0.023 per GB, about $0.21 | 50 hours is at most about 450 GB, about $10 a month. Kept originals add to this |
| Encoding (MediaConvert) | About $3.15 per 60-minute video for 3 SD and 2 HD outputs | About $158 once for the library, and again for any re-encode |

- **Fixed monthly floor:** the load balancer, the database and the always-on app tasks.
- **Per use:** SMS per OTP, AI per chat, and the gateway fee per payment.
- The main lever on delivery cost is the bitrate ladder: lower bitrates for the mobile qualities, and starting mobile viewers at 480p or 720p. Not measured yet.

## Build order
One thin end-to-end slice first, so integration problems show up early. This is a plan, not a validated estimate.

1. **Days 1 to 3:** the lead finishes screen designs, data model and API contract. Developers start in parallel: AWS accounts and CI/CD, OTP and DLT registration, payments in sandbox, and the video pipeline spike. **Gate 1:** client sign-off of design and estimate around day 4 or 5.
2. **End of week 1, video checkpoint:** a test video is encoded and played end to end through S3, MediaConvert and CloudFront. If not, switch to a managed video platform behind the same interface.
3. **End of week 2, thin slice:** OTP login, the Meera chat with one assessment, the report, one paid course through checkout, and video playback with signed access.
4. **Weeks 3 and 4, widen:** all question sets and scoring, bundles, quizzes, progress and resume, the dashboard, admin lists, the callback alert and the PDF report. **Gate 2:** a demo on dev in the middle of this period.
5. **Final days:** client acceptance testing (**Gate 3**), the load test, and the go-live checklist, including one real low-value purchase on production, then a refund.

**If the date is at risk, cut in this order:** PDF download first, then progress detail beyond the resume position, then the short quiz.
**We protect:** OTP login, the chat with scores and report, lead capture with consent, one paid course through checkout, signed video playback, admin course upload and pricing, and the funnel events.

## Risks
| Risk | Impact | Mitigation |
|---|---|---|
| Four weeks with two developers, and Diwali holidays inside them | Release slips past 22 November | Thin slice by week 2, a pre-agreed cut list, and design starting on day 1 |
| Payment account not ready (business details, GST) | No paid sales at launch | Start KYC with two gateways now. Admin can grant access manually |
| Legal pages and domain not decided | Payment activation and SMS registration are delayed | Ask the client for the name and domain this week. Draft simple legal pages for the lawyer |
| Users under 18 with no age gate | Legal exposure under children's data rules | Client decision on record. Lawyer review. No marketing messages, no ad pixels and no chat text stored |
| DLT registration for OTP SMS takes long | Nobody can log in | Start registration at once. Keep the SMS provider swappable. Confirm timing with the provider |
| Video pipeline slips | No course playback | Week-1 checkpoint and a managed-platform fallback behind the same interface |
| Spike after an influencer post | Slow site or high bills | Autoscaling with a ceiling, CDN cache, rate limits, spend cutoffs and campaign notice |
| AI cost or misuse | Surprise bill, or odd output for young users | AI only rewords fixed questions, with daily caps and a spend cutoff |
| Content or question sets arrive late | Real courses and assessments cannot be tested | Build with placeholders. Agree a drop-dead date for each input |
| Report read as medical or psychological advice | Reputation and legal risk | Wording approved by the client. The report is described as guidance |

## Open decisions (as of the doc; see decisions.md for current state)
| Decision | Options | Owner | Needed by |
|---|---|---|---|
| Backend language and framework | TypeScript end to end (assumed), or Python backend with a React front end | CTO or tech lead | Before day 1 |
| AWS region | Mumbai or Hyderabad, subject to MediaConvert availability | CTO or tech lead | Day 1 |
| AWS account owner and credits | Client's account, or ours with a later handover | Lead architect and client | Day 1 |
| Payment gateway | Razorpay (default) or Cashfree, after written rates and onboarding times | Lead architect | Start KYC in week 1 |
| SMS provider and DLT entity | India-focused provider, registered under the client's legal entity | Lead architect and client | Week 1 |
| AI provider | Short comparison on wording quality, cost, data terms and data location | Lead architect | Before the chat build, week 2 |
| Analytics tool and inactivity timeout | A Mixpanel-style tool. Timeout length to agree | Lead architect | Week 2 |
| Email provider and sender domain | Needs the final domain | Lead architect and client | Before launch |
| Original videos | Keep in standard storage, move to a cheaper class, or delete after encoding | Lead architect | Week 2 |
| Quality ladder and default quality | Fixed in the week-1 video spike | Developers | End of week 1 |
| Database upgrade trigger | When to move from a single zone to a second zone | CTO or tech lead | Before launch |
| Client confirmations | No raw chat text, helpline and report wording, prices and bundles, legal entity and pages, name and domain | Client | Client to give dates |
| Live sessions approach (Phase 2) | Zoom embedded, SDK, or link-out | Lead architect | Before Phase 2 starts |

## Left for Phase 2
The Phase 1 design keeps room for the items below without a rewrite. None is built in Phase 1.
- **Live sessions and calendar (about 6 December):** sessions become a new product type, and the entitlement model already supports seats. The meeting tool approach is still open.
- **Reminders:** the job queue and email interface carry session reminders.
- **B2B colleges (December to January):** a college becomes a group that owns learners and entitlements, with email and password login added beside OTP.
- **Mentors and 1:1 booking:** a mentor role and availability slots, with a paid booking as another product.
- **Certificates:** issued from progress and entitlements, once the client defines the format.
- **Subscriptions and promo codes:** entitlements already allow an expiry, and orders can be extended with a discount field.
- **Server PDF reports and the paid deeper report:** the report template is shared by web and PDF.
- **CRM and WhatsApp or SMS marketing:** the leads webhook and the stored consent flags are the starting point.
- **DRM:** the video interface lets us move to a DRM-capable platform.
- **Hindi screens and the MY SELF AI companion:** question text and report text are stored as versioned config, so other languages can be added. A companion needs its own memory design, because Phase 1 stores no chat text.
