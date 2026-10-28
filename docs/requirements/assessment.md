# Assessment: OCEAN and RIASEC question sets

What the Meera quiz asks, how answers are scored, and how the report is built. Decision: [D62](../decisions.md) (fixed question variants replace AI rewording). Related: D18 (no raw chat text), D46 (only the name is typed), D47 (careers part of the report), D60 (assessment shape). Module: `chat` in [../architecture/modules.md](../architecture/modules.md).

> **Status: draft.** All item wording below is a draft for the client to approve (see [../open-questions.md](../open-questions.md)). Scoring thresholds also need sign-off.

## 1. Summary
- About 26 quick-tap questions (D60 says "about 25"): **4 basics, 10 OCEAN (2 per trait), 12 RIASEC (2 per type)**. Order: basics, OCEAN, RIASEC.
- Each question has a fixed **question ID** and **2 to 3 pre-approved variants** (wordings). The AI is not used anywhere in the quiz. Scoring is a pure, unit-tested function that sees question IDs and answer values only.
- OCEAN items are written in the style of the **IPIP** (public domain, commercial use allowed). RIASEC items are **our own** (no free validated set has a clear commercial licence for reworded items).
- Two items per scale is short. Treat results as **a first look**: broad bands for OCEAN, a top-3 interest area for RIASEC. No percentiles, no precise scores, no claims of clinical or scientific validation.

## 2. Sources and licensing
| Source | Use for | Verdict | Notes |
|---|---|---|---|
| IPIP Big Five markers (ipip.ori.org) | OCEAN item style | **Use** | Public domain: "permission has already been automatically granted ... for any person to use IPIP items, scales, and inventories for any purpose, commercial or non-commercial". No attribution needed. Citing Goldberg is good practice. Source: [ipip.ori.org/newPermission.htm](https://ipip.ori.org/newPermission.htm), [50-item key](https://ipip.ori.org/newBigFive5broadKey.htm). **Re-read the quote before launch** (our research fetched it through a summarising tool) |
| IPIP RIASEC scales | RIASEC | **Does not exist** | The IPIP index lists only ORVIS (8 vocational scales), not Holland types. [Scale index](https://ipip.ori.org/newIndexofScaleLabels.htm) |
| Our own RIASEC items | RIASEC | **Use** | Written by us, so no licence and free to write variants. **Not validated.** Describe as "based on Holland's six interest types", never as a validated test |
| O\*NET Mini-IP (30 items) | RIASEC | **Later upgrade** | Free, 5 items per type, alpha about .73 ([manual](https://www.onetcenter.org/dl_files/IP_Manual.pdf)). Verbatim use is CC BY-ND; any reworded variant needs the O\*NET Tools Developer License (credit O\*NET and DOL, say it was modified, "validate" the product; meaning unclear). The page does not state commercial terms. **Email O\*NET before using it.** [Licence page](https://www.onetcenter.org/license_tools.html) |
| O\*NET Database (occupation RIASEC data) | Career families | **Optional** | CC BY 4.0 with attribution. Can seed career families. See section 8 |
| BFI-2 | OCEAN | **Rejected** | Non-commercial research only; commercial use needs a request (unverified, pages were not fetchable) |
| NEO-PI-R / NEO-FFI, Holland SDS | Both | **Rejected** | Proprietary, sold commercially |

## 3. Question-set design
Versioned config in `modules/chat` (see section 7). Fixed IDs never change meaning; if an item's meaning or key changes, it gets a new ID.

| Stage | IDs | Count | Input |
|---|---|---|---|
| Basics | `b-name`, `b-age`, `b-status`, `b-goal` | 4 | Name is typed (D46); age band, studying/working/other, goal are taps. Not scored |
| OCEAN | `o-O-1`, `o-O-2`, `o-C-1`, `o-C-2`, `o-E-1`, `o-E-2`, `o-A-1`, `o-A-2`, `o-N-1`, `o-N-2` | 10 | 5-point tap |
| RIASEC | `r-R-1`, `r-R-2`, `r-I-1`, `r-I-2`, `r-A-1`, `r-A-2`, `r-S-1`, `r-S-2`, `r-E-1`, `r-E-2`, `r-C-1`, `r-C-2` | 12 | 5-point tap |

**Answer scales** (fixed labels, shown the same for every variant):
- OCEAN, "How much does this sound like you?": 1 Not like me · 2 A little · 3 Somewhat · 4 Mostly · 5 Just like me.
- RIASEC, "How much would you enjoy this?": 1 Not at all · 2 A little · 3 Okay · 4 Quite a lot · 5 Love it.

**Neuroticism is shown as "emotional steadiness".** The `N` dimension is keyed so a high score means steady and calm. `o-N-1` is worded steady (+), `o-N-2` is worded worried (-, reversed). Never show it as "neuroticism" or as a problem.

## 4. Variants
- Each item has 2 to 3 variants, e.g. `o-E-1.v1`, `o-E-1.v2`. Variants must mean the same thing and keep the same polarity (a reverse-keyed item stays reverse-keyed in every variant).
- **Selection:** one variant per item per session, picked by hash of `sessionId + questionId` modulo the variant count. Deterministic, so a refresh or resume shows the same wording, and no randomness is stored.
- **Storage:** the answer is stored as `questionId` + `variantId` + value (D18: no text). The wording lives only in config.
- **Scoring ignores `variantId`.** It exists for analysis (does one wording behave differently?) and for audit.
- Variants are the only wording flexibility. There is no live rewording and no AI call in the quiz.

## 5. Variant authoring rules
Checklist for every variant (writer and client reviewer):
1. Same idea and same direction as the base item. A reverse item stays reverse.
2. One idea per sentence. No "and"/"or" that asks two things.
3. Plain words, about class 8 reading level, short sentences, works for ages about 15 and up. No jargon.
4. No leading or flattering phrasing; no "good" or "bad" answer is obvious.
5. No clinical, diagnostic or medical words (anxiety, depression, disorder). No judgments about people.
6. No salary, rank, percentile, or "best/worst" language.
7. Hindi and other languages are later (the config supports adding them; scope.md).
8. Max about 90 characters, fits 375px without scrolling.

**Versioning:** editing a variant's wording is a patch (`1.0.0` to `1.0.1`, no re-approval of scoring). Adding or removing an item, changing a key or dimension, or changing the scale is a **new set version** (`1.1.0`); results keep the set version they were scored with.

## 6. Scoring (pure function, no AI)
Input: map of `questionId` to value 1 to 5, plus the set version. No other input.

1. **Reverse keys:** for items keyed `-`, value becomes `6 - value`.
2. **Dimension score:** mean of the (keyed) answered items, then `score = round((mean - 1) / 4 * 100)`. With 2 items per dimension scores can be 0, 13, 25, 38, 50, 63, 75, 88, 100 (steps of 12.5, rounded half up).
3. **Minimum answered:** the stage needs at least 80% of its items answered and at least 1 item per dimension, otherwise the result for that stage is `incomplete` (no report for it).
4. **Invalid (straight-lining):** all items in a stage have the same raw value. Show "your answers were all the same, want to try again?" and offer a retake; do not produce a report for that stage. For OCEAN this is a heuristic, since reverse items make all-same answers inconsistent.
5. **OCEAN bands:** `<= 37` Lower · `38 to 62` Middle · `>= 63` Higher. Report uses bands only, never the number.
6. **Holland code (RIASEC):** rank the six types by score, high to low. **Ties break in fixed order R, I, A, S, E, C.** The code is the top 3 letters.
7. **Close top 3:** if `score(1st) - score(3rd) <= 13`, the three are within about one answer step: show them as a group ("your top interests are close") with the letters in rank order, no claim of a strict order.
8. **No clear lead (flat):** if `max - min <= 13` across all six types, there is no Holland code; show a gentle "broad interests" message and suggest courses by the basics' goal instead.
9. Thresholds (37/62, 13) live in config, not code, and need client sign-off.

### Worked examples (use as unit-test fixtures)
Raw answers are entered values; `-` items are shown after reversal.

**F1: tie-break and close top 3**
| Dim | Item 1 | Item 2 | Keyed values | Mean | Score |
|---|---|---|---|---|---|
| O | 5 | 2 (-) | 5, 4 | 4.5 | 88 |
| C | 4 | 2 (-) | 4, 4 | 4.0 | 75 |
| E | 2 | 4 (-) | 2, 2 | 2.0 | 25 |
| A | 5 | 1 (-) | 5, 5 | 5.0 | 100 |
| N (steadiness) | 3 | 3 (-) | 3, 3 | 3.0 | 50 |

RIASEC raw (all `+`): R 2,1 -> 13 · I 5,4 -> 88 · A 4,4 -> 75 · S 4,5 -> 88 · E 3,3 -> 50 · C 2,3 -> 38.
Ranking: I 88, S 88 (tie, **I before S** by R-I-A-S-E-C), A 75. Code **ISA**. Spread 88 - 75 = 13 <= 13 so shown as a **close group**.
OCEAN bands: O Higher, C Higher, E Lower, A Higher, N Middle.

**F2: clear lead.** RIASEC raw: R 5,5 · I 4,4 · A 3,3 · S 2,2 · E 1,1 · C 1,2 -> scores R 100, I 75, A 50, S 25, E 0, C 13. Code **RIA**, spread 50, ranked strictly.

**F3: flat.** All twelve RIASEC answers are 3 -> all scores 50. This also trips the straight-lining rule (all same raw value), so the stage is **invalid, retake**. A flat-but-varied case (e.g. 3,3,3,4,3,3,3,3,3,3,3,3) gives all scores within 13 of each other -> **no clear lead**, no code.

**F4: incomplete.** Only 9 of 12 RIASEC items answered -> below 80% (9.6) -> stage `incomplete`.

## 7. Data model sketch (not implementation)
Question-set config (in `modules/chat`, versioned, committed):
```ts
type QuestionSet = {
  version: string;            // "1.0.0"
  scales: { ocean: ScaleLabels; riasec: ScaleLabels };
  items: Item[];
  thresholds: { oceanLow: number; oceanHigh: number; closeSpread: number; minAnsweredPct: number };
};
type Item = {
  id: string;                 // "o-E-2" (fixed, never reused)
  stage: "ocean" | "riasec";
  dimension: string;          // OCEAN: O C E A N · RIASEC: R I A S E C (same letters recur, so always pair with `stage`)
  key: "+" | "-";             // reverse-keyed when "-"
  variants: { id: string; text: string }[];   // 2 to 3, same polarity
};
```
Stored answer: `sessionId`, `questionId`, `variantId`, `value` (1 to 5), `setVersion`, `answeredAt`. Stored result: `sessionId`, `setVersion`, per-dimension score, status (`ok`/`incomplete`/`invalid`/`flat`), `hollandCode`. **No question text and no free text stored** (D18). Name and basics follow the profile data rules (name is PII). OCEAN `A` (Agreeableness) and RIASEC `A` (Artistic) share a letter, so always key by stage + dimension.

## 8. Report mapping
- **OCEAN:** strengths (Higher bands) and growth areas (Lower bands) as short, plain sentences, e.g. Higher Conscientiousness -> "You follow through", Lower -> "Growth: break big tasks into small steps". Middle shows no card. Neuroticism appears only as **emotional steadiness**. Footer line: "This is a first look based on a few questions. It is not a diagnosis or a clinical test."
- **RIASEC:** top interest areas (the Holland code letters, plain names), 3 to 5 **example career families** per area, and **suggested courses** from the catalog. Career families come from a hand-curated list per RIASEC type (seed from the prototype `careers.ts`, **strip % fit, salary and anything per-person**). Optional later: derive from the O\*NET Database with the required attribution.
- **Never shown:** aptitude, work values, percentile, "top N%", salary, % fit, certificates, learner counts (CLAUDE.md, scope.md).

## 9. Open items
| Item | Owner | Status |
|---|---|---|
| Client approval of all item wording and variants, and report copy | Client | open (in open-questions.md) |
| Sign-off on thresholds: bands 37/62, close spread 13, minimum 80%, tie order R-I-A-S-E-C | Client + lead | open |
| How RIASEC is described to users (no "validated" claim) | Client + lawyer | open |
| Lawyer review of the "not a diagnosis" footer | Client | open |
| Career family source: hand-curated now, O\*NET Database later? | Lead | open |
| Optional upgrade: email O\*NET about Mini-IP use with variants | Lead | not started |
| `src/modules/chat/questions.ts` and `scoring.ts` are prototype code (aptitude, values, percentile, % fit). Rewrite them in the chat feature, with its own spec (`/feature-spec`) | Dev | not started |
| `src/integrations/ai/` is no longer used by the quiz. Remove it in the chat feature spec | Dev | not started |

## 10. Draft item wording
All drafts. `+` = agree-keyed, `-` = reversed. Variant 1 is the base wording.

### OCEAN ("How much does this sound like you?")
| ID | Trait | Key | Variant 1 | Variant 2 |
|---|---|---|---|---|
| `o-O-1` | Openness | + | I enjoy trying new ideas. | I like learning things I have never tried. |
| `o-O-2` | Openness | - | I prefer to do things the usual way. | I would rather stick to what I already know. |
| `o-C-1` | Conscientiousness | + | I finish what I start. | Once I begin something, I see it through. |
| `o-C-2` | Conscientiousness | - | I leave my work until the last minute. | I put things off until I am almost out of time. |
| `o-E-1` | Extraversion | + | I start conversations easily. | Meeting new people feels easy for me. |
| `o-E-2` | Extraversion | - | In a group, I stay in the background. | I like to keep quiet when I am with many people. |
| `o-A-1` | Agreeableness | + | I notice when someone around me is upset. | I care about how other people feel. |
| `o-A-2` | Agreeableness | - | I am not very interested in other people's problems. | I would rather focus on my own things than on others' troubles. |
| `o-N-1` | Emotional steadiness | + | I stay calm when things go wrong. | I keep my cool under pressure. |
| `o-N-2` | Emotional steadiness | - | Small problems can make me feel very stressed. | I get upset easily. |

### RIASEC ("How much would you enjoy this?")
| ID | Type | Variant 1 | Variant 2 |
|---|---|---|---|
| `r-R-1` | Realistic | Fixing or building something with my hands. | Repairing a machine or making something from parts. |
| `r-R-2` | Realistic | Working outdoors or with tools and equipment. | Spending a day with tools, machines or nature. |
| `r-I-1` | Investigative | Figuring out how something works by testing it. | Solving a tricky puzzle or science problem. |
| `r-I-2` | Investigative | Researching a question until I find the answer. | Exploring to understand why things happen. |
| `r-A-1` | Artistic | Drawing, writing, designing or making music. | Creating something original, like art, a story or a song. |
| `r-A-2` | Artistic | Coming up with new, creative ideas for a project. | Designing how something should look or feel. |
| `r-S-1` | Social | Helping someone learn something new. | Teaching or coaching a friend. |
| `r-S-2` | Social | Supporting people who are going through a hard time. | Listening to people and helping with their problems. |
| `r-E-1` | Enterprising | Leading a team to reach a goal. | Taking charge of a group project. |
| `r-E-2` | Enterprising | Convincing others to back my idea. | Starting a small business or selling something. |
| `r-C-1` | Conventional | Organising information, files or schedules neatly. | Keeping lists and records in perfect order. |
| `r-C-2` | Conventional | Following clear steps to get a task exactly right. | Checking details and numbers to avoid mistakes. |

Add a third variant to any item the client wants more variety on, following the rules in section 5.
