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
| Approval of the question sources and the "loose" items (draft set 1.0.0, now replaced by the pool) | to give date | **approved 2026-11-03** as part of the bank approval; draft set no longer used |
| Sign-off on the scoring rules that are our own choices (bands 37/63, spread 13, minimum 80%, tie order R-I-A-S-E-C, straight-lining) | to give date | **approved 2026-11-03** (D69). The quiz stays at 2 questions per trait or type, so the thresholds fit as designed |
| Report footer wording about validity ("a first look ... not a validated test ... based on Holland's six interest types") | to give date | **temporary line in use; confirm with the client and a lawyer later** |
| Variants: the approved pool has one wording per question. For the 22 live questions we draft 2 more wordings each (3 per question, D62/D69); the client sees them before launch | Lead + client | drafts by us, client review open |
| Helpline link and wording, plus the blocked-word list for the name check (chat spec) | to give date | open |
| Final prices, bundles, maximum discounts, refund policy | to give date | open |
| One team email address for callback alerts | to give date | open |
| Helpline link and wording for the self-harm stop message | to give date | open |
| Confirmation: no raw chat text stored (D18) | to give date | open |
| Final domain (needed for SES DKIM/SPF and sender name) | to give date | open |
| Confirm: free lecture previews need **no login** (D66, direction from us on Nov 2, 2026; the client has not confirmed). Replaces the earlier "first lesson needs login" question | to give date | open |
| Confirm: login by phone **or email** with the same OTP (D65, Nov 2, 2026). Spec comes later; email needs the final domain for SES | to give date | open |
| Admin phone numbers: how many and which (expect 2 to 4); they get the admin role at login (D64) | to give date | open |
| Legal review: no age gate with many users under 18 (DPDP Act) | client | open |

## Chat inactivity timeout
Config `CHAT_INACTIVITY_MINUTES`, default 30. Client may tune it. (Decision D58.)
