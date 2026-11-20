// The approved question pool (client-approved wording, 2026-11-03): 25 personality and 25 interest questions.
// DATA ONLY: no logic. The live quiz picks a subset of these by ID (question-set.ts); the rest stay in reserve.
// Provenance is in docs/requirements/item-sources.md. Personality = rewrites of IPIP markers (public domain).
// Interests = rewrites of ORVIS activities (public domain, Pozzebon et al. 2010). Rewrites do not carry the
// published reliability figures of the originals. Wording changes are a patch version of the set that uses them.
import type { Dimension, ItemSource, Stage } from "./question-set";

export type PoolItem = {
  /** Fixed, never reused once a real learner answer is stored (D68). Live items use the same ID. */
  id: string;
  stage: Stage;
  dimension: Dimension;
  /** "-" items are reverse-keyed when scored. */
  key: "+" | "-";
  /** The approved wording (variant 1 of a live item). */
  text: string;
  source: ItemSource;
};

const ipip = (marker: string, scale: string, match: "direct" | "close" | "loose"): ItemSource => ({
  kind: "ipip",
  marker,
  scale,
  match,
});
const orvis = (activity: string, scale: string, match: "direct" | "close" | "loose"): ItemSource => ({
  kind: "orvis",
  activity,
  scale,
  match,
});

const p = (
  id: string,
  stage: Stage,
  dimension: Dimension,
  key: "+" | "-",
  text: string,
  source: ItemSource,
): PoolItem => ({ id, stage, dimension, key, text, source });

export const QUESTION_POOL: readonly PoolItem[] = [
  // Personality (IPIP)
  p(
    "o-O-1",
    "ocean",
    "O",
    "+",
    "I have lots of new ideas in my head.",
    ipip("Am full of ideas.", "IPIP-50 · Intellect/Imagination", "close"),
  ),
  p(
    "o-O-2",
    "ocean",
    "O",
    "+",
    "I can easily picture new things in my mind.",
    ipip("Have a vivid imagination.", "IPIP-50 · Intellect/Imagination", "close"),
  ),
  p(
    "o-O-3",
    "ocean",
    "O",
    "+",
    "I enjoy going to places I have not been before.",
    ipip("Like to visit new places.", "IPIP-NEO · Adventurousness", "close"),
  ),
  p(
    "o-O-4",
    "ocean",
    "O",
    "-",
    "I find it hard to understand ideas that I cannot see or touch.",
    ipip("Have difficulty understanding abstract ideas.", "IPIP-50 · Intellect/Imagination", "close"),
  ),
  p(
    "o-O-5",
    "ocean",
    "O",
    "-",
    "I find it hard to imagine things that I have not seen.",
    ipip("Do not have a good imagination.", "IPIP-50 · Intellect/Imagination", "close"),
  ),
  p(
    "o-C-1",
    "ocean",
    "C",
    "+",
    "I do my chores or homework right away, without waiting.",
    ipip("Get chores done right away.", "IPIP-50 · Conscientiousness", "close"),
  ),
  p(
    "o-C-2",
    "ocean",
    "C",
    "+",
    "I pay attention to small details when I do my work.",
    ipip("Pay attention to details.", "IPIP-50 · Conscientiousness", "close"),
  ),
  p(
    "o-C-3",
    "ocean",
    "C",
    "+",
    "I like my things to be neat and in their place.",
    ipip("Like order.", "IPIP-50 · Conscientiousness", "close"),
  ),
  p(
    "o-C-4",
    "ocean",
    "C",
    "-",
    "I often leave my things lying around instead of putting them away.",
    ipip("Leave my belongings around.", "IPIP-50 · Conscientiousness", "close"),
  ),
  p(
    "o-C-5",
    "ocean",
    "C",
    "-",
    "I try to avoid my duties or responsibilities when I can.",
    ipip("Shirk my duties.", "IPIP-50 · Conscientiousness", "close"),
  ),
  p(
    "o-E-1",
    "ocean",
    "E",
    "+",
    "I find it easy to start a conversation with people.",
    ipip("Start conversations.", "IPIP-50 · Extraversion", "close"),
  ),
  p(
    "o-E-2",
    "ocean",
    "E",
    "+",
    "I feel comfortable when I am with other people.",
    ipip("Feel comfortable around people.", "IPIP-50 · Extraversion", "close"),
  ),
  p(
    "o-E-3",
    "ocean",
    "E",
    "+",
    "At family or social events, I talk to many different people.",
    ipip("Talk to a lot of different people at parties.", "IPIP-50 · Extraversion", "close"),
  ),
  p(
    "o-E-4",
    "ocean",
    "E",
    "-",
    "When I am in a group, I prefer to stay in the background.",
    ipip("Keep in the background.", "IPIP-50 · Extraversion", "close"),
  ),
  p(
    "o-E-5",
    "ocean",
    "E",
    "-",
    "I stay quiet when I am with people I do not know.",
    ipip("Am quiet around strangers.", "IPIP-50 · Extraversion", "close"),
  ),
  p(
    "o-A-1",
    "ocean",
    "A",
    "+",
    "I make time to help other people.",
    ipip("Take time out for others.", "IPIP-50 · Agreeableness", "close"),
  ),
  p(
    "o-A-2",
    "ocean",
    "A",
    "+",
    "I understand and feel for people when they are upset.",
    ipip("Sympathize with others' feelings.", "IPIP-50 · Agreeableness", "close"),
  ),
  p(
    "o-A-3",
    "ocean",
    "A",
    "+",
    "I help people feel relaxed and comfortable around me.",
    ipip("Make people feel at ease.", "IPIP-50 · Agreeableness", "close"),
  ),
  p(
    "o-A-4",
    "ocean",
    "A",
    "-",
    "I am not interested in hearing about other people's problems.",
    ipip("Am not interested in other people's problems.", "IPIP-50 · Agreeableness", "close"),
  ),
  p(
    "o-A-5",
    "ocean",
    "A",
    "-",
    "I do not feel much care or concern for other people.",
    ipip("Feel little concern for others.", "IPIP-50 · Agreeableness", "close"),
  ),
  p(
    "o-N-1",
    "ocean",
    "N",
    "+",
    "I stay relaxed and calm most of the time.",
    ipip("Am relaxed most of the time.", "IPIP-50 · Emotional Stability", "close"),
  ),
  p(
    "o-N-2",
    "ocean",
    "N",
    "+",
    "I rarely feel sad or unhappy.",
    ipip("Seldom feel blue.", "IPIP-50 · Emotional Stability", "close"),
  ),
  p(
    "o-N-3",
    "ocean",
    "N",
    "-",
    "I feel stressed very easily.",
    ipip("Get stressed out easily.", "IPIP-50 · Emotional Stability", "close"),
  ),
  p(
    "o-N-4",
    "ocean",
    "N",
    "-",
    "I worry a lot about things.",
    ipip("Worry about things.", "IPIP-50 · Emotional Stability", "close"),
  ),
  p(
    "o-N-5",
    "ocean",
    "N",
    "-",
    "I get upset very easily.",
    ipip("Get upset easily.", "IPIP-50 · Emotional Stability", "close"),
  ),
  // Interests (ORVIS)
  p(
    "r-R-1",
    "riasec",
    "R",
    "+",
    "Repairing a bike, scooter or car.",
    orvis("Repair cars or trucks", "ORVIS · Production (Realistic)", "close"),
  ),
  p(
    "r-R-2",
    "riasec",
    "R",
    "+",
    "Doing woodwork or working with tools and machines.",
    orvis("Do woodworking / Work with tools and machinery", "ORVIS · Production (Realistic)", "close"),
  ),
  p(
    "r-R-3",
    "riasec",
    "R",
    "+",
    "Growing plants, vegetables or crops.",
    orvis("Cultivate plants", "ORVIS · Production (Realistic)", "close"),
  ),
  p(
    "r-R-4",
    "riasec",
    "R",
    "+",
    "Going on an adventure outdoors, like trekking or camping in the hills.",
    orvis("Engage in exciting adventures / Survive in the wilderness", "ORVIS · Adventure (Realistic)", "close"),
  ),
  p(
    "r-R-5",
    "riasec",
    "R",
    "+",
    "Playing in sports matches and competitions.",
    orvis("Compete in athletic events", "ORVIS · Adventure (Realistic)", "close"),
  ),
  p(
    "r-I-1",
    "riasec",
    "I",
    "+",
    "Planning a science experiment in a lab.",
    orvis("Design a laboratory experiment", "ORVIS · Analysis (Investigative)", "close"),
  ),
  p(
    "r-I-2",
    "riasec",
    "I",
    "+",
    "Solving hard puzzles or tricky problems.",
    orvis("Solve complex puzzles", "ORVIS · Analysis (Investigative)", "close"),
  ),
  p(
    "r-I-3",
    "riasec",
    "I",
    "+",
    "Writing a computer program or code.",
    orvis("Develop a computer program", "ORVIS · Analysis (Investigative)", "close"),
  ),
  p(
    "r-I-4",
    "riasec",
    "I",
    "+",
    "Doing medical or science research to find new cures.",
    orvis("Carry out medical research", "ORVIS · Analysis (Investigative)", "close"),
  ),
  p(
    "r-A-1",
    "riasec",
    "A",
    "+",
    "Painting or drawing pictures.",
    orvis("Paint or draw", "ORVIS · Creativity (Artistic)", "close"),
  ),
  p(
    "r-A-2",
    "riasec",
    "A",
    "+",
    "Writing your own short stories.",
    orvis("Write short stories or novels", "ORVIS · Creativity (Artistic)", "close"),
  ),
  p(
    "r-A-3",
    "riasec",
    "A",
    "+",
    "Acting in a play or a drama.",
    orvis("Act in a play", "ORVIS · Creativity (Artistic)", "close"),
  ),
  p(
    "r-A-4",
    "riasec",
    "A",
    "+",
    "Designing web pages or mobile apps.",
    orvis("Design Internet web pages", "ORVIS · Creativity (Artistic)", "close"),
  ),
  p(
    "r-S-1",
    "riasec",
    "S",
    "+",
    "Helping other people learn new things.",
    orvis("Help others learn new ideas", "ORVIS · Altruism (Social)", "close"),
  ),
  p(
    "r-S-2",
    "riasec",
    "S",
    "+",
    "Comforting and supporting people when they need it.",
    orvis("Provide comfort and support to others", "ORVIS · Altruism (Social)", "close"),
  ),
  p(
    "r-S-3",
    "riasec",
    "S",
    "+",
    "Helping people decide which career to choose.",
    orvis("Help people make career decisions", "ORVIS · Altruism (Social)", "close"),
  ),
  p(
    "r-S-4",
    "riasec",
    "S",
    "+",
    "Taking care of people who are sick.",
    orvis("Care for sick people", "ORVIS · Altruism (Social)", "close"),
  ),
  p(
    "r-E-1",
    "riasec",
    "E",
    "+",
    "Leading a group of people.",
    orvis("Lead other people", "ORVIS · Leadership (Enterprising)", "close"),
  ),
  p(
    "r-E-2",
    "riasec",
    "E",
    "+",
    "Convincing other people to change their mind.",
    orvis("Persuade others to change their views", "ORVIS · Leadership (Enterprising)", "close"),
  ),
  p(
    "r-E-3",
    "riasec",
    "E",
    "+",
    "Planning how to advertise a new product.",
    orvis("Plan an advertising campaign", "ORVIS · Leadership (Enterprising)", "close"),
  ),
  p(
    "r-E-4",
    "riasec",
    "E",
    "+",
    "Making important decisions that affect many people.",
    orvis("Make decisions that affect a lot of people", "ORVIS · Leadership (Enterprising)", "close"),
  ),
  p(
    "r-C-1",
    "riasec",
    "C",
    "+",
    "Keeping careful and detailed records.",
    orvis("Keep detailed records", "ORVIS · Organization (Conventional)", "close"),
  ),
  p(
    "r-C-2",
    "riasec",
    "C",
    "+",
    "Making a budget to plan how money is spent.",
    orvis("Plan budgets", "ORVIS · Organization (Conventional)", "close"),
  ),
  p(
    "r-C-3",
    "riasec",
    "C",
    "+",
    "Setting up a filing system for papers and documents.",
    orvis("Develop an office filing system", "ORVIS · Organization (Conventional)", "close"),
  ),
  p(
    "r-C-4",
    "riasec",
    "C",
    "+",
    "Keeping count of the stock in a shop.",
    orvis("Keep track of a company's inventory", "ORVIS · Organization (Conventional)", "close"),
  ),
];

const BY_ID = new Map(QUESTION_POOL.map((item) => [item.id, item]));

/** Looks up a pool question. Throws on an unknown ID: a typo in a set is a build-time data error. */
export function getPoolItem(id: string): PoolItem {
  const item = BY_ID.get(id);
  if (!item) throw new Error(`Unknown pool question "${id}"`);
  return item;
}
