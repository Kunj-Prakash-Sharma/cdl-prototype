// The versioned question set for the Meera quiz. DATA ONLY: no logic, no imports from db, env or time.
// Source of truth: docs/requirements/assessment.md (sections 3 to 7) and the approved pool in question-pool.ts.
// The set only lists WHICH pool questions are asked (and their extra wordings), so swapping a question is a one-line
// change here and a new set version. Wording is client-approved; variants 2 and 3 are our drafts until the client
// sees them (docs/open-questions.md). Keep it as data so it can change without touching scoring.
//
// Versioning (assessment.md section 5): editing a variant's wording is a patch (1.0.0 to 1.0.1). Adding or removing
// an item, or changing a key, a dimension, the scale or a threshold is a new version (1.1.0). Never delete an old
// set that real attempts used: attempts keep the version they started with and are scored against it.
import { getPoolItem } from "./question-pool";

export type Stage = "ocean" | "riasec";
/** "basics" holds the name and the tap questions about the learner; the others come from the items. */
export type StageId = "basics" | Stage;
export type OceanDimension = "O" | "C" | "E" | "A" | "N";
export type RiasecDimension = "R" | "I" | "A" | "S" | "E" | "C";
/** `A` exists in both stages (Agreeableness, Artistic), so a dimension is always read together with its stage. */
export type Dimension = OceanDimension | RiasecDimension;

/** Fixed order. For RIASEC this is also the tie-break order (assessment.md section 6, rule 6). */
export const OCEAN_DIMENSIONS: readonly OceanDimension[] = ["O", "C", "E", "A", "N"];
export const RIASEC_DIMENSIONS: readonly RiasecDimension[] = ["R", "I", "A", "S", "E", "C"];

export type Variant = { id: string; text: string };

/**
 * Where a question comes from (docs/requirements/item-sources.md). `ipip` = our plain rewrite of an IPIP marker,
 * `orvis` = our plain rewrite of an ORVIS activity (both public domain). `match`: "direct" = same idea, near same
 * words; "close" = same idea, different words; "loose" = related idea only. Provenance only: scoring never reads it.
 */
export type ItemSource =
  | { kind: "ipip"; marker: string; scale: string; match: "direct" | "close" | "loose" }
  | { kind: "orvis"; activity: string; scale: string; match: "direct" | "close" | "loose" };

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

/** What the learner sees for one part of the quiz (draft wording until the client approves it). */
export type StageCopy = {
  /** Short name in the top step bar. */
  label: string;
  /** Heading of the part. */
  title: string;
  subtitle: string;
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
  /** Headings for each part, shown in the step bar and above the questions. Data, so the UI hardcodes no part name. */
  stageCopy: Record<StageId, StageCopy>;
  /** The last step in the bar, after the questions. */
  finishLabel: string;
};

const v = (itemId: string, ...texts: string[]): Variant[] =>
  texts.map((text, i) => ({ id: `${itemId}.v${i + 1}`, text }));

/** The questions this version asks, in order: personality (agree-keyed, then reverse-keyed, per trait), then interests. */
const LIVE: readonly { id: string; more: readonly [string, string] }[] = [
  { id: "o-O-1", more: ["My mind is full of new ideas.", "New ideas come to me all the time."] },
  {
    id: "o-O-4",
    more: [
      "Ideas that are not real or visible are hard for me to follow.",
      "I struggle to understand things that I cannot see or touch.",
    ],
  },
  {
    id: "o-C-1",
    more: ["I start my chores or homework straight away.", "When I have work to do, I get it done right away."],
  },
  {
    id: "o-C-5",
    more: ["I try to get out of my duties when I can.", "I skip my responsibilities when I get the chance."],
  },
  {
    id: "o-E-1",
    more: ["Starting a chat with someone is easy for me.", "I find it easy to talk to people first."],
  },
  {
    id: "o-E-4",
    more: ["In a group, I like to stay quietly at the back.", "In a group, I keep to the background."],
  },
  {
    id: "o-A-2",
    more: [
      "When someone is upset, I can feel what they are going through.",
      "I feel for people when they are going through a hard time.",
    ],
  },
  {
    id: "o-A-4",
    more: ["I am not keen to listen to other people's problems.", "Other people's problems do not interest me."],
  },
  { id: "o-N-1", more: ["I feel calm and relaxed on most days.", "I am usually calm and at ease."] },
  {
    id: "o-N-3",
    more: ["It does not take much to make me feel stressed.", "I get stressed out quickly."],
  },
  {
    id: "r-R-1",
    more: ["Fixing a bike, scooter or other vehicle.", "Finding out what is wrong with a bike or car and fixing it."],
  },
  {
    id: "r-R-4",
    more: ["Trekking or camping outdoors.", "Spending a few days on an outdoor adventure in the hills or forest."],
  },
  {
    id: "r-I-2",
    more: ["Working out a difficult puzzle or riddle.", "Figuring out the answer to a really tricky problem."],
  },
  {
    id: "r-I-3",
    more: [
      "Learning to write code for a computer or phone app.",
      "Building a small program that makes a computer do something.",
    ],
  },
  {
    id: "r-A-1",
    more: ["Drawing or painting something from your imagination.", "Making art, like sketches or paintings."],
  },
  {
    id: "r-A-2",
    more: ["Making up and writing a story of your own.", "Writing a short story from your own ideas."],
  },
  {
    id: "r-S-1",
    more: ["Teaching someone how to do something new.", "Helping a classmate or friend understand something."],
  },
  {
    id: "r-S-2",
    more: [
      "Being there for people when they are having a hard time.",
      "Listening to and supporting people who are going through a hard time.",
    ],
  },
  { id: "r-E-1", more: ["Being the leader of a team.", "Taking charge and guiding a group to reach a goal."] },
  { id: "r-E-2", more: ["Talking people into trying your idea.", "Persuading others to see things your way."] },
  {
    id: "r-C-1",
    more: [
      "Writing down details carefully and keeping them in order.",
      "Keeping neat records of things, like lists or accounts.",
    ],
  },
  { id: "r-C-2", more: ["Planning how to spend and save money.", "Working out a monthly budget for money."] },
];

/** Variant 1 is the approved pool wording; variants 2 and 3 are the extra wordings listed above. */
const liveItem = ({ id, more }: { id: string; more: readonly [string, string] }): Item => {
  const poolItem = getPoolItem(id);
  return {
    id: poolItem.id,
    source: poolItem.source,
    stage: poolItem.stage,
    dimension: poolItem.dimension,
    key: poolItem.key,
    variants: v(poolItem.id, poolItem.text, ...more),
  };
};

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

  items: LIVE.map(liveItem),

  thresholds: { oceanLow: 37, oceanHigh: 63, closeSpread: 13, minAnsweredPct: 80 },

  stageCopy: {
    basics: {
      label: "About you",
      title: "Let's get to know you",
      subtitle: "A few quick questions so your report fits you.",
    },
    ocean: {
      label: "Personality",
      title: "Your personality",
      subtitle: "How you tend to think, feel and act. There are no right or wrong answers.",
    },
    riasec: {
      label: "Interests",
      title: "Your interests",
      subtitle: "The kind of work and activities you would enjoy.",
    },
  },
  finishLabel: "Your report",

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
