# Open questions and flags

Update the status and date as items close. When an item closes, record the outcome in [decisions.md](decisions.md).

## Flags (need research or an external action)
| Item | Owner | Needed by | Status |
|---|---|---|---|
| Mixpanel plans, pricing and free-tier limits; request India data residency (region is fixed per project, so ask before creating it) | Lead architect | Week 1 | open |
| SMS provider choice and DLT registration under the client's legal entity. **The client handles DLT himself (Nov 2, 2026).** From him we need the approved sender name and the exact approved OTP template text; the SMS provider choice is still open | Client + lead | Start week 1 | client doing DLT; provider open |
| ORVIS licence and Holland mapping: the 2010 paper (Pozzebon et al.) calls ORVIS public domain throughout; mapping matches its appendix. See [requirements/item-sources.md](requirements/item-sources.md) | Team | Before launch | **done 2026-11-03** |
| Day-1 AWS checks in Mumbai: MediaConvert, ECS Express Mode (Bedrock check dropped, D62) | Developers | Day 1 | open |
| Repo `Kunj-Prakash-Sharma/cdl-prototype` is **public**: recommend making it private before production code lands (no branch protection; team follows branch + PR + green CI) | Kunj | Before real code is pushed | open |
| How code reaches AWS: CI only checks and builds the image, there is no deploy step. CI runs on PRs into `dev` and pushes to `dev` only; add `main` when there is a release flow | Lead architect | Before first deploy | open |
| AWS account owner and credits (client's account, or ours with a later handover) | Lead + client | Day 1 | open |
| Database upgrade trigger (single zone → second zone) | CTO / tech lead | Before launch | open |
| Video quality ladder and default quality (from the week-1 spike) | Developers | End of week 1 | open |
| Confirm the vendors and AWS products we assumed but the docs never named: Sentry (error tracking), ECR (image registry), Secrets Manager, CloudWatch, GitHub Actions. See `architecture/integrations.md` | Lead architect | Week 1 | open |
| IPIP permission page read by Tanu (open to use, commercial use allowed, no attribution asked). Quote in [requirements/item-sources.md](requirements/item-sources.md) | Tanu | Before launch | done 2026-10-30 |
| Email O\*NET: is commercial use allowed, and which licence covers reworded items? (their pages disagree: CC BY 4.0 vs CC BY-ND). Draft written 2026-10-30. Only needed to upgrade RIASEC to the Mini-IP; no O\*NET wording is copied now | Tanu sends | Not blocking launch | draft ready, not sent |

## Client inputs
From the Scope of Work. Dates are "to give" unless stated.
| Input | Needed by | Status |
|---|---|---|
| First 3 to 4 courses (videos, PDFs, descriptions). Not blocking the build: we use sample videos until they arrive (D67) | Nov 5, 2026 | agreed |
| Brand name, logo, colours, website address, name shown in login SMS | to give date | open |
| Payment account in the client's business name (KYC; GST status) | to give date | open |
| Privacy, terms and refund pages | to give date | open |
| Approval of the 50-question bank wording, scoring cut-offs and report cards (style B, "Balanced" middle cards) | to give date | **approved 2026-11-03** (D69). Client's one change: even answer labels, applied |
| Approval of the question sources (the pool) | to give date | **approved 2026-11-03** as part of the bank approval |
| Sign-off on the scoring rules that are our own choices (bands 37/63, spread 13, minimum 80%, tie order R-I-A-S-E-C, straight-lining) | to give date | **approved 2026-11-03** (D69). The quiz stays at 2 questions per trait or type, so the thresholds fit as designed |
| Report footer wording about validity ("a first look ... not a validated test ... based on Holland's six interest types") | to give date | **temporary line in use; confirm with the client and a lawyer later** |
| Variants: the approved pool has one wording per question. For the 22 live questions we draft 2 more wordings each (3 per question, D62/D69); the client sees them before launch | Lead + client | drafts by us, client review open |
| Helpline link and wording (also for the self-harm stop message), plus the blocked-word list for the name check (chat spec). A dummy helpline stays in place until the client gives the real one | to give date | open |
| Final prices, bundles, maximum discounts, refund policy | to give date | open |
| One team email address for callback alerts | to give date | open |
| Confirmation: no raw chat text stored (D18) | to give date | open |
| Final domain (needed for SES DKIM/SPF and sender name) | to give date | open |
| Confirm: free lecture previews need **no login** (D66, direction from us on Nov 2, 2026; the client has not confirmed). Replaces the earlier "first lesson needs login" question | to give date | open |
| Confirm: login by phone **or email** with the same OTP (D65, Nov 2, 2026). Spec comes later; email needs the final domain for SES | to give date | open |
| Admin phone numbers: how many and which (expect 2 to 4); they get the admin role at login (D64) | to give date | open |
| Legal review: no age gate with many users under 18 (DPDP Act) | client | open |
| Report personality cards (15) are **DRAFT text** (D72). Copy the client-approved wording from the client sample page into `report-copy.ts` and remove the draft marker before any real learner sees a report | Us | Before launch | open |
| Legal review of the under-18 consent route (D71): the login/terms line telling parents to log in for a learner under 18, and the age-based consent wording on the callback form. Exact wording needs the client's lawyer | client | open |

## V5 design vs earlier decisions (D81, Nov 17, 2026)
The V5 screens show things that earlier decisions rule out or that have no data yet. Settled item by item in D82 (Nov 18, 2026); two items stay open until their screen is built.
| Item in V5 | Conflicts with / needs | Backend change if accepted | Status |
|---|---|---|---|
| Guide is called **"MIRA"** | Docs and code say Meera | No (one value in `src/config/brand.ts`) | **Decided (D82):** Mira |
| **Certificates** (course card meta, "Your certificates", certificate dialog) | Out of Phase 1 (CLAUDE.md, design-system) | Yes: completion records, certificate issuing | **Decided (D82):** not built |
| **Payment method and bank picker** on the course page | Card data never touches our servers; hosted checkout only | Yes: `commerce` module with Razorpay hosted checkout (V5 screen can only be the review step) | **Decided (D82):** not built; hosted checkout only |
| **"How we score"** page | D72 skipped it (V2 sample) | No for a static page | open: client decides later (D82) |
| **Coupon NEWYEAR26 and 25% off prices**, offer bar | Final prices and discounts are an open client input | Yes for real coupons (`commerce`); no for a static offer bar | **Decided (D82):** sample content, no real coupon |
| **Student stories** with names on the home page | Needs real, approved stories (no invented people or stats) | No | **Decided (D82):** sample content until real stories |
| Report **persona title** ("The Curious Thinker") and **scored strengths** ("Problem solving 94") | Not in the report data; wording needs client approval (like D69) | Yes: `chat` report data and `report-copy.ts` | **Decided (D82):** sample content, not shown in production |
| **"Choose two"** answer type in the quiz | Question set has single-choice and scale only; scoring and stored answers assume one value | Yes: `chat` question set, answer storage, scoring | **Decided (D82):** sample UI, answer not stored or scored |
| **Courses, course page, My Learning** with real data | Courses are a static file; no orders, entitlements or progress yet | Yes: `catalog`, `commerce`, `video` modules (big features, spec first) | **Decided (D82):** V5 on sample data now, wired later |
| **Course search** on V5 Courses | E7 says search is not in Phase 1 | No (client-side filter of the list) | open: ask when V5 Courses is built (D82) |

## Chat inactivity timeout
Config `CHAT_INACTIVITY_MINUTES`, default 30. Client may tune it. (Decision D58.)
