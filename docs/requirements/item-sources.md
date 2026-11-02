# Item sources (provenance of the quiz questions)

Updated 2026-11-02. Answers "where did each question come from?". All wording is a draft until the client approves it. The client-facing copy is [../client-review/meera-question-bank.html](../client-review/meera-question-bank.html). The code side is `src/modules/chat/question-set.ts` (`source` field on every item).

## What is what
| Part | Source | Status |
|---|---|---|
| **Pool, personality (25)** | Plain-language rewrites of **IPIP** markers: 50-item Big Five key ([key page](https://ipip.ori.org/newBigFive5broadKey.htm)) and IPIP-NEO facets ([NEO key](https://ipip.ori.org/newNEOKey.htm)). IPIP is public domain | Licence read by the team 2026-10-30. Rewrites do not carry the published reliability figures |
| **Pool, interests (25)** | Plain-language rewrites of **ORVIS** activities (Oregon Vocational Interest Scales, [key page](https://ipip.ori.org/newORVISKey.htm)), mapped to Holland types as in Pozzebon et al. 2010 | **Licence likely OK, not confirmed** (see below). Holland mapping not yet checked against the paper |
| **Draft set 1.0.0** (22 items, in code) | Our own earlier drafts (10 IPIP-style personality, 12 own interest items). A **draft selection** to be rebuilt from the pool once the client picks the questions | Replaced by a pool selection (D68) |
| Scoring rules | Mix of convention and our own choices | `assessment.md` section 6, "Provenance" |

## Licence check
- **IPIP (personality):** read by the team on 2026-10-30 at [ipip.ori.org/newPermission.htm](https://ipip.ori.org/newPermission.htm): "Because the IPIP has been placed in the public domain, permission has already been automatically granted ... for any person to use IPIP items, scales, and inventories for any purpose, commercial or non-commercial." No attribution requested.
- **ORVIS (interests), checked 2026-11-02:** the [IPIP home page](https://ipip.ori.org/) says "The items and scales are in the public domain, which means that one can copy, edit, translate, or use them for any purpose without asking permission and without paying a fee." It does not name ORVIS. The ORVIS key page has no licence text and only cites Pozzebon, Visser, Ashton, Lee & Goldberg (2010). That paper's title calls ORVIS a "public-domain self-report measure of vocational interests", but the paper page could not be read by our tool. The paper also says some ORVIS items were drawn from related IPIP and BRI scales and from content of a commercial survey (CISS).
- **Verdict:** very likely free to use. Open items: the team opens the 2010 paper once to check the licence wording and the scale-to-Holland mapping; optional one-line email to the IPIP site if the client's lawyer wants it in writing.

`Match`: **direct** = same idea, near same words. **close** = same idea, different words.

## Pool (50 questions, for client review)
IDs below are the pool's own. They overlap by name with the draft set 1.0.0 below but **mean different things** (for example pool `o-O-1` is "I have lots of ideas", draft `o-O-1` is "I enjoy trying new ideas"). Until launch the draft set may be re-numbered; see "Rules for IDs".

### Personality (OCEAN), 25
| Pool ID | Dim | Key | Plain wording | Original IPIP marker / ORVIS activity | Source scale | Match |
|---|---|---|---|---|---|---|
| `o-O-1` | O | + | I have lots of ideas. | Am full of ideas. | IPIP-50 · Intellect/Imagination | direct |
| `o-O-2` | O | + | I have a vivid imagination. | Have a vivid imagination. | IPIP-50 · Intellect/Imagination | direct |
| `o-O-3` | O | + | I like visiting new places. | Like to visit new places. | IPIP-NEO · Adventurousness | direct |
| `o-O-4` | O | - | Abstract ideas are hard for me to follow. | Have difficulty understanding abstract ideas. (reversed) | IPIP-50 · Intellect/Imagination | close |
| `o-O-5` | O | - | I am not good at imagining things. | Do not have a good imagination. (reversed) | IPIP-50 · Intellect/Imagination | close |
| `o-C-1` | C | + | I get my chores done right away. | Get chores done right away. | IPIP-50 · Conscientiousness | direct |
| `o-C-2` | C | + | I pay attention to details. | Pay attention to details. | IPIP-50 · Conscientiousness | direct |
| `o-C-3` | C | + | I like things to be in order. | Like order. | IPIP-50 · Conscientiousness | close |
| `o-C-4` | C | - | I often leave my things lying around. | Leave my belongings around. (reversed) | IPIP-50 · Conscientiousness | close |
| `o-C-5` | C | - | I avoid my duties when I can. | Shirk my duties. (reversed) | IPIP-50 · Conscientiousness | close |
| `o-E-1` | E | + | I start conversations easily. | Start conversations. | IPIP-50 · Extraversion | direct |
| `o-E-2` | E | + | I feel comfortable around people. | Feel comfortable around people. | IPIP-50 · Extraversion | direct |
| `o-E-3` | E | + | I talk to lots of different people at social events. | Talk to a lot of different people at parties. | IPIP-50 · Extraversion | close |
| `o-E-4` | E | - | In a group, I stay in the background. | Keep in the background. (reversed) | IPIP-50 · Extraversion | close |
| `o-E-5` | E | - | I am quiet around people I don't know. | Am quiet around strangers. (reversed) | IPIP-50 · Extraversion | close |
| `o-A-1` | A | + | I take time out for others. | Take time out for others. | IPIP-50 · Agreeableness | direct |
| `o-A-2` | A | + | I feel for people when they are upset. | Sympathize with others' feelings. | IPIP-50 · Agreeableness | close |
| `o-A-3` | A | + | I make people feel at ease. | Make people feel at ease. | IPIP-50 · Agreeableness | direct |
| `o-A-4` | A | - | I am not interested in other people's problems. | Am not interested in other people's problems. (reversed) | IPIP-50 · Agreeableness | direct |
| `o-A-5` | A | - | I do not feel much concern for others. | Feel little concern for others. (reversed) | IPIP-50 · Agreeableness | close |
| `o-N-1` | N | + | I am relaxed most of the time. | Am relaxed most of the time. | IPIP-50 · Emotional Stability | direct |
| `o-N-2` | N | + | I seldom feel low or sad. | Seldom feel blue. | IPIP-50 · Emotional Stability | close |
| `o-N-3` | N | - | I get stressed out easily. | Get stressed out easily. (reversed) | IPIP-50 · Emotional Stability | direct |
| `o-N-4` | N | - | I worry about things. | Worry about things. (reversed) | IPIP-50 · Emotional Stability | direct |
| `o-N-5` | N | - | I get upset easily. | Get upset easily. (reversed) | IPIP-50 · Emotional Stability | direct |

### Interests (RIASEC), 25
| Pool ID | Dim | Key | Plain wording | Original IPIP marker / ORVIS activity | Source scale | Match |
|---|---|---|---|---|---|---|
| `r-R-1` | R | + | Repairing a car or a bike. | Repair cars or trucks | ORVIS · Production (Realistic) | close |
| `r-R-2` | R | + | Doing woodworking or working with tools and machines. | Do woodworking / Work with tools and machinery | ORVIS · Production (Realistic) | close |
| `r-R-3` | R | + | Growing plants or crops. | Cultivate plants | ORVIS · Production (Realistic) | close |
| `r-R-4` | R | + | Going on an outdoor adventure, like trekking or camping. | Engage in exciting adventures / Survive in the wilderness | ORVIS · Adventure (Realistic) | close |
| `r-R-5` | R | + | Taking part in sports and athletic events. | Compete in athletic events | ORVIS · Adventure (Realistic) | close |
| `r-I-1` | I | + | Planning a science experiment. | Design a laboratory experiment | ORVIS · Analysis (Investigative) | close |
| `r-I-2` | I | + | Solving hard puzzles. | Solve complex puzzles | ORVIS · Analysis (Investigative) | close |
| `r-I-3` | I | + | Writing a computer program. | Develop a computer program | ORVIS · Analysis (Investigative) | close |
| `r-I-4` | I | + | Doing medical or science research. | Carry out medical research | ORVIS · Analysis (Investigative) | close |
| `r-A-1` | A | + | Painting or drawing. | Paint or draw | ORVIS · Creativity (Artistic) | direct |
| `r-A-2` | A | + | Writing short stories. | Write short stories or novels | ORVIS · Creativity (Artistic) | close |
| `r-A-3` | A | + | Acting in a play. | Act in a play | ORVIS · Creativity (Artistic) | direct |
| `r-A-4` | A | + | Designing web pages or apps. | Design Internet web pages | ORVIS · Creativity (Artistic) | close |
| `r-S-1` | S | + | Helping others learn new things. | Help others learn new ideas | ORVIS · Altruism (Social) | close |
| `r-S-2` | S | + | Comforting and supporting people. | Provide comfort and support to others | ORVIS · Altruism (Social) | close |
| `r-S-3` | S | + | Helping people choose a career. | Help people make career decisions | ORVIS · Altruism (Social) | close |
| `r-S-4` | S | + | Caring for people who are sick. | Care for sick people | ORVIS · Altruism (Social) | close |
| `r-E-1` | E | + | Leading other people. | Lead other people | ORVIS · Leadership (Enterprising) | direct |
| `r-E-2` | E | + | Persuading others to change their mind. | Persuade others to change their views | ORVIS · Leadership (Enterprising) | close |
| `r-E-3` | E | + | Planning an advertising campaign. | Plan an advertising campaign | ORVIS · Leadership (Enterprising) | direct |
| `r-E-4` | E | + | Making decisions that affect many people. | Make decisions that affect a lot of people | ORVIS · Leadership (Enterprising) | close |
| `r-C-1` | C | + | Keeping detailed records. | Keep detailed records | ORVIS · Organization (Conventional) | direct |
| `r-C-2` | C | + | Planning a budget. | Plan budgets | ORVIS · Organization (Conventional) | close |
| `r-C-3` | C | + | Setting up a filing system. | Develop an office filing system | ORVIS · Organization (Conventional) | close |
| `r-C-4` | C | + | Keeping track of the stock in a shop. | Keep track of a company's inventory | ORVIS · Organization (Conventional) | close |

## Draft set 1.0.0 (22 items in code today)
Our own earlier drafts, mapped to the nearest IPIP marker. `loose` = related idea, no exact marker in the IPIP 50-item key. Kept until the client picks questions from the pool, then rebuilt from the pool.

| Our ID | Trait | Our key | Our variant 1 | IPIP marker (key) | Match | Note |
|---|---|---|---|---|---|---|
| `o-O-1` | Openness (IPIP: Intellect/Imagination) | + | I enjoy trying new ideas. | "Am full of ideas." (+) | loose | Ours is about trying new things; IPIP-50 stresses ideas and imagination |
| `o-O-2` | Openness | - | I prefer to do things the usual way. | "Am not interested in abstract ideas." (-) | loose | Ours is about routine, IPIP is about abstract thinking. Different facet |
| `o-C-1` | Conscientiousness | + | I finish what I start. | "Get chores done right away." (+) | loose | Follow-through vs promptness |
| `o-C-2` | Conscientiousness | - | I leave my work until the last minute. | "Shirk my duties." (-) | close | Procrastination vs avoiding duties |
| `o-E-1` | Extraversion | + | I start conversations easily. | "Start conversations." (+) | direct | |
| `o-E-2` | Extraversion | - | In a group, I stay in the background. | "Keep in the background." (-) | direct | |
| `o-A-1` | Agreeableness | + | I notice when someone around me is upset. | "Feel others' emotions." (+) | close | |
| `o-A-2` | Agreeableness | - | I am not very interested in other people's problems. | "Am not interested in other people's problems." (-) | direct | |
| `o-N-1` | Emotional steadiness (IPIP: Emotional Stability) | + | I stay calm when things go wrong. | "Am relaxed most of the time." (+) | close | |
| `o-N-2` | Emotional steadiness | - | Small problems can make me feel very stressed. | "Get stressed out easily." (-) | direct | Variant 2 "I get upset easily." is close to IPIP "Get upset easily." (-) |

Draft set interests (12 items, `r-*`): written by us, no outside source, not validated. The pool's interest questions replace them if the client approves.

## Rules for IDs and changes
- **IDs freeze when a real learner's answer is first stored** (launch, or staging with real users). Until then draft sets may be re-numbered freely. After that an ID never changes meaning; a changed idea gets a new ID and a new set version.
- Rewording an item but keeping its idea: patch version (1.0.0 to 1.0.1).
- Adding, removing or re-keying items, or changing the quiz length: new set version (1.1.0). Old attempts keep the version they started with.
- Never add an item without a `source` (a test enforces it).
- O*NET Mini-IP is a possible later upgrade for interests (licence unclear; see `assessment.md` section 9). No O*NET wording is used.
