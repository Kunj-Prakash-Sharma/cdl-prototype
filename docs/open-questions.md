# Open questions and flags

Update the status and date as items close. When an item closes, record the outcome in [decisions.md](decisions.md).

## Flags (need research or an external action)
| Item | Owner | Needed by | Status |
|---|---|---|---|
| Mixpanel plans, pricing and free-tier limits; request India data residency (region is fixed per project, so ask before creating it) | Lead architect | Week 1 | open |
| SMS provider choice and DLT registration under the client's legal entity (sender name + approved templates) | Client + lead | Start week 1 | open |
| Day-1 AWS checks in Mumbai: MediaConvert, ECS Express Mode (Bedrock check dropped, D62) | Developers | Day 1 | open |
| Repo `Kunj-Prakash-Sharma/cdl-prototype` is **public**: recommend making it private before production code lands (no branch protection; team follows branch + PR + green CI) | Kunj | Before real code is pushed | open |
| How code reaches AWS: CI only checks and builds the image, there is no deploy step. CI runs on PRs into `dev` and pushes to `dev` only; add `main` when there is a release flow | Lead architect | Before first deploy | open |
| AWS account owner and credits (client's account, or ours with a later handover) | Lead + client | Day 1 | open |
| Database upgrade trigger (single zone → second zone) | CTO / tech lead | Before launch | open |
| Video quality ladder and default quality (from the week-1 spike) | Developers | End of week 1 | open |
| Confirm the vendors and AWS products we assumed but the docs never named: Sentry (error tracking), ECR (image registry), Secrets Manager, CloudWatch, GitHub Actions. See `architecture/integrations.md` | Lead architect | Week 1 | open |

## Client inputs
From the Scope of Work. Dates are "to give" unless stated.
| Input | Needed by | Status |
|---|---|---|
| First 3 to 4 courses (videos, PDFs, descriptions) | Nov 5, 2026 | agreed |
| Brand name, logo, colours, website address, name shown in login SMS | to give date | open |
| Payment account in the client's business name (KYC; GST status) | to give date | open |
| Privacy, terms and refund pages | to give date | open |
| Approval of question wording **and variants** (OCEAN, RIASEC; drafts in [requirements/assessment.md](requirements/assessment.md)), scoring thresholds and report wording | to give date | open |
| Helpline link and wording, plus the blocked-word list for the name check (chat spec) | to give date | open |
| Final prices, bundles, maximum discounts, refund policy | to give date | open |
| One team email address for callback alerts | to give date | open |
| Helpline link and wording for the self-harm stop message | to give date | open |
| Confirmation: no raw chat text stored (D18) | to give date | open |
| Final domain (needed for SES DKIM/SPF and sender name) | to give date | open |
| Confirm: the first lesson is free of payment but needs login (so we can see where viewers stop). The Scope of Work says "free preview" | to give date | open |
| Admin phone numbers: how many and which (expect 2 to 4); they get the admin role at login (D64) | to give date | open |
| Legal review: no age gate with many users under 18 (DPDP Act) | client | open |

## Chat inactivity timeout
Config `CHAT_INACTIVITY_MINUTES`, default 30. Client may tune it. (Decision D58.)
