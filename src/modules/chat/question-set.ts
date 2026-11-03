// The versioned question set for the Meera quiz. DATA ONLY: no logic, no imports from db, env or time.
// Source of truth: docs/requirements/assessment.md (sections 3 to 7 and the draft wording in section 10).
// All wording is a DRAFT until the client approves it (docs/open-questions.md). Keep it here as data so it can
// change without touching scoring.
//
// Versioning (assessment.md section 5): editing a variant's wording is a patch (1.0.0 to 1.0.1). Adding or removing
// an item, or changing a key, a dimension, the scale or a threshold is a new version (1.1.0). Never delete an old
// set: attempts keep the version they started with and are scored against it.

export type Stage = "ocean" | "riasec";
export type OceanDimension = "O" | "C" | "E" | "A" | "N";
export type RiasecDimension = "R" | "I" | "A" | "S" | "E" | "C";
/** `A` exists in both stages (Agreeableness, Artistic), so a dimension is always read together with its stage. */
export type Dimension = OceanDimension | RiasecDimension;

/** Fixed order. For RIASEC this is also the tie-break order (assessment.md section 6, rule 6). */
export const OCEAN_DIMENSIONS: readonly OceanDimension[] = ["O", "C", "E", "A", "N"];
export const RIASEC_DIMENSIONS: readonly RiasecDimension[] = ["R", "I", "A", "S", "E", "C"];

export type Variant = { id: string; text: string };

/**
 * Where an item idea comes from (docs/requirements/item-sources.md). `ipip` items are our simpler rewordings of an
 * IPIP marker (public domain, https://ipip.ori.org); `match` says how close: "direct" (same idea, near same words),
 * "close" (same idea, different words), "loose" (related idea; no exact IPIP-50 marker). `own` items are written by us
 * and are not validated. Provenance only: scoring never reads it.
 */
export type ItemSource = { kind: "ipip"; marker: string; match: "direct" | "close" | "loose" } | { kind: "own" };

export type Item = {
  /** Fixed, never reused: "o-E-2". If an item's meaning or key changes it gets a new ID. */
  id: string;
  source: ItemSource;
  stage: Stage;
  dimension: Dimension;
  /** "-" items are reverse-keyed when scored. Every variant of an item keeps the same polarity. */
  key: "+" | "-";
  /** 2 to 3 pre-approved wordings of the same idea. Scoring never looks at which one was shown. */
  variants: Variant[];
};

export type ScaleLabels = {
  prompt: string;
  /** Labels for the values 1 to 5, in order. Shown the same for every variant. */
  labels: readonly [string, string, string, string, string];
};

export type Thresholds = {
  /** OCEAN score at or below this is "lower" (37). */
  oceanLow: number;
  /** OCEAN score at or above this is "higher" (63). */
  oceanHigh: number;
  /** RIASEC: a top-3 spread at or below this is a "close" group; a whole-profile spread at or below it is "flat" (13). */
  closeSpread: number;
  /** A stage needs at least this share of its items answered (80). */
  minAnsweredPct: number;
};

export type BasicOption = {
  id: string;
  label: string;
  /** Meera's short reply after this answer (draft copy). */
  acknowledgement: string;
};

export type BasicQuestion = {
  id: "b-age" | "b-status" | "b-goal";
  prompt: string;
  /** The stored answer is the 0-based position in this list. Basics are never scored. */
  options: BasicOption[];
};

export type QuestionSet = {
  version: string;
  /** The typed name question (D46: the only free text). Its answer goes to the learner profile, never to answers. */
  name: { id: "b-name"; prompt: string };
  basics: BasicQuestion[];
  scales: Record<Stage, ScaleLabels>;
  items: Item[];
  thresholds: Thresholds;
  /** Short Meera lines shown between scored questions (draft copy). */
  acknowledgements: string[];
};

const v = (itemId: string, ...texts: string[]): Variant[] =>
  texts.map((text, i) => ({ id: `${itemId}.v${i + 1}`, text }));

const ipip = (marker: string, match: "direct" | "close" | "loose"): ItemSource => ({ kind: "ipip", marker, match });

const ocean = (
  id: string,
  dimension: OceanDimension,
  key: "+" | "-",
  source: ItemSource,
  ...texts: string[]
): Item => ({
  id,
  source,
  stage: "ocean",
  dimension,
  key,
  variants: v(id, ...texts),
});

// RIASEC items are all agree-keyed: "How much would you enjoy this?"
const riasec = (id: string, dimension: RiasecDimension, ...texts: string[]): Item => ({
  id,
  source: { kind: "own" },
  stage: "riasec",
  dimension,
  key: "+",
  variants: v(id, ...texts),
});

export const QUESTION_SET_1_0_0: QuestionSet = {
  version: "1.0.0",

  name: { id: "b-name", prompt: "What should I call you?" },

  basics: [
    {
      id: "b-age",
      prompt: "How old are you?",
      options: [
        { id: "under-15", label: "Under 15", acknowledgement: "Great time to start exploring." },
        { id: "15-17", label: "15 to 17", acknowledgement: "Great time to start exploring." },
        { id: "18-21", label: "18 to 21", acknowledgement: "A good time to try out different paths." },
        { id: "22-25", label: "22 to 25", acknowledgement: "A good time to try out different paths." },
        { id: "26-plus", label: "26 or older", acknowledgement: "Plenty of people change direction at this stage." },
      ],
    },
    {
      id: "b-status",
      prompt: "What are you doing right now?",
      options: [
        { id: "school", label: "School student", acknowledgement: "The choices you make now open lots of doors." },
        { id: "college", label: "College student", acknowledgement: "College is a good time to test different paths." },
        { id: "working", label: "Working", acknowledgement: "Small changes now can make a big difference." },
        { id: "looking", label: "Looking for work", acknowledgement: "Let's find a direction that suits you." },
        { id: "other", label: "Something else", acknowledgement: "Thanks for sharing that." },
      ],
    },
    {
      id: "b-goal",
      prompt: "What do you want most right now?",
      options: [
        {
          id: "first-job",
          label: "A first job in a field I love",
          acknowledgement: "Let's find a field you will enjoy, and the skills that get you hired.",
        },
        {
          id: "switch",
          label: "A more fulfilling career",
          acknowledgement: "We will look for paths that build on what you already bring.",
        },
        {
          id: "lead",
          label: "To grow into a leader",
          acknowledgement: "Good to know. Leadership interests will show up in your results.",
        },
        {
          id: "venture",
          label: "To build my own venture",
          acknowledgement: "A future founder. I will point out the skills that matter most for that.",
        },
        {
          id: "explore",
          label: "Not sure yet, help me explore",
          acknowledgement: "That is completely fine. Exploring is exactly what this is for.",
        },
      ],
    },
  ],

  scales: {
    ocean: {
      prompt: "How much does this sound like you?",
      labels: ["Not at all me", "A little like me", "Somewhat like me", "Mostly me", "Exactly me"],
    },
    riasec: {
      prompt: "How much would you enjoy this?",
      labels: ["Not at all", "A little", "Somewhat", "Quite a lot", "A lot"],
    },
  },

  items: [
    // OCEAN. N is keyed so that a high score means steady and calm ("emotional steadiness").
    ocean(
      "o-O-1",
      "O",
      "+",
      ipip("Am full of ideas.", "loose"),
      "I enjoy trying new ideas.",
      "I like learning things I have never tried.",
    ),
    ocean(
      "o-O-2",
      "O",
      "-",
      ipip("Am not interested in abstract ideas.", "loose"),
      "I prefer to do things the usual way.",
      "I would rather stick to what I already know.",
    ),
    ocean(
      "o-C-1",
      "C",
      "+",
      ipip("Get chores done right away.", "loose"),
      "I finish what I start.",
      "Once I begin something, I see it through.",
    ),
    ocean(
      "o-C-2",
      "C",
      "-",
      ipip("Shirk my duties.", "close"),
      "I leave my work until the last minute.",
      "I put things off until I am almost out of time.",
    ),
    ocean(
      "o-E-1",
      "E",
      "+",
      ipip("Start conversations.", "direct"),
      "I start conversations easily.",
      "Meeting new people feels easy for me.",
    ),
    ocean(
      "o-E-2",
      "E",
      "-",
      ipip("Keep in the background.", "direct"),
      "In a group, I stay in the background.",
      "I like to keep quiet when I am with many people.",
    ),
    ocean(
      "o-A-1",
      "A",
      "+",
      ipip("Feel others' emotions.", "close"),
      "I notice when someone around me is upset.",
      "I care about how other people feel.",
    ),
    ocean(
      "o-A-2",
      "A",
      "-",
      ipip("Am not interested in other people's problems.", "direct"),
      "I am not very interested in other people's problems.",
      "I would rather focus on my own things than on others' troubles.",
    ),
    ocean(
      "o-N-1",
      "N",
      "+",
      ipip("Am relaxed most of the time.", "close"),
      "I stay calm when things go wrong.",
      "I keep my cool under pressure.",
    ),
    ocean(
      "o-N-2",
      "N",
      "-",
      ipip("Get stressed out easily.", "direct"),
      "Small problems can make me feel very stressed.",
      "I get upset easily.",
    ),

    // RIASEC
    riasec(
      "r-R-1",
      "R",
      "Fixing or building something with my hands.",
      "Repairing a machine or making something from parts.",
    ),
    riasec(
      "r-R-2",
      "R",
      "Working outdoors or with tools and equipment.",
      "Spending a day with tools, machines or nature.",
    ),
    riasec(
      "r-I-1",
      "I",
      "Figuring out how something works by testing it.",
      "Solving a tricky puzzle or science problem.",
    ),
    riasec(
      "r-I-2",
      "I",
      "Researching a question until I find the answer.",
      "Exploring to understand why things happen.",
    ),
    riasec(
      "r-A-1",
      "A",
      "Drawing, writing, designing or making music.",
      "Creating something original, like art, a story or a song.",
    ),
    riasec(
      "r-A-2",
      "A",
      "Coming up with new, creative ideas for a project.",
      "Designing how something should look or feel.",
    ),
    riasec("r-S-1", "S", "Helping someone learn something new.", "Teaching or coaching a friend."),
    riasec(
      "r-S-2",
      "S",
      "Supporting people who are going through a hard time.",
      "Listening to people and helping with their problems.",
    ),
    riasec("r-E-1", "E", "Leading a team to reach a goal.", "Taking charge of a group project."),
    riasec("r-E-2", "E", "Convincing others to back my idea.", "Starting a small business or selling something."),
    riasec(
      "r-C-1",
      "C",
      "Organising information, files or schedules neatly.",
      "Keeping lists and records in perfect order.",
    ),
    riasec(
      "r-C-2",
      "C",
      "Following clear steps to get a task exactly right.",
      "Checking details and numbers to avoid mistakes.",
    ),
  ],

  thresholds: { oceanLow: 37, oceanHigh: 63, closeSpread: 13, minAnsweredPct: 80 },

  acknowledgements: [
    "Got it.",
    "Thanks.",
    "Okay, noted.",
    "Good to know.",
    "Thanks for being honest.",
    "Almost there.",
  ],
};

/** Every set that ever shipped, by version. Never remove an entry: old attempts are scored against their own version. */
export const QUESTION_SETS: Readonly<Record<string, QuestionSet>> = {
  [QUESTION_SET_1_0_0.version]: QUESTION_SET_1_0_0,
};

export const CURRENT_QUESTION_SET: QuestionSet = QUESTION_SET_1_0_0;

export function getQuestionSet(version: string): QuestionSet | undefined {
  return QUESTION_SETS[version];
}
