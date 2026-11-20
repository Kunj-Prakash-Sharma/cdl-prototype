// The wording of the free report, as DATA ONLY: no logic, no imports from db, env or time.
// Source: docs/requirements/assessment.md section 8 (style B: every trait has a card in every band, so neither end
// reads as better) and D72.
//
// DRAFT: the client's approved card text is not copied in yet, so version 1.0.0-draft is our own placeholder wording
// and `draft: true` makes the report show a visible draft tag. Replace it with the approved wording, then set
// `draft: false` (open-questions.md). Neuroticism appears only as "Emotional steadiness"; the N score is keyed so
// that high means steady (assessment.md section 3).
//
// Versioning, same idea as question-set.ts: every finished attempt stores the version it will be read with
// (`chat_results.report_version`), and the report is built from THAT version. The draft version may be edited in place
// until the first real learner result is stored; after that it is frozen, and a wording change is a new version added
// to REPORT_COPIES. Never delete an entry that real results used.
import { CAREER_FAMILIES_1_0_0, type CareerFamilies } from "./careers";
import type { OceanDimension, RiasecDimension } from "./question-set";
import type { OceanBand } from "./scoring";

export type TraitCard = { title: string; note: string; tip: string };
export type TraitCopy = { name: string; cards: Record<OceanBand, TraitCard> };
export type InterestCopy = { name: string; description: string };

/**
 * One persona per top interest type, plus a generic one for a flat profile (D81, D88). Which one a learner gets is
 * decided by `personaIdFor` (persona.ts); this is only the wording.
 */
export type PersonaId = RiasecDimension | "explorer";
export type PersonaBlock = { title: string; note: string };
export type PersonaCopy = { name: string; tagline: string; strengths: PersonaBlock[]; growth: PersonaBlock[] };

export type ReportCopy = {
  version: string;
  /** True until the client's approved wording replaces this text. Shown on the report as a visible tag. */
  draft: boolean;
  traits: Record<OceanDimension, TraitCopy>;
  interests: Record<RiasecDimension, InterestCopy>;
  /** DRAFT until the client approves the personas (open-questions.md): 3 strengths and 2 growth areas each. */
  personas: Record<PersonaId, PersonaCopy>;
  careerFamilies: CareerFamilies;
  /** Heading of the line that shows the tip of the lowest-scoring trait. */
  tryFirstLabel: string;
  closeNote: string;
  flatNote: string;
  /** Shown on the whole report. Temporary until the client and a lawyer confirm it (assessment.md section 9). */
  footer: string;
};

const REPORT_COPY_1_0_0_DRAFT: ReportCopy = {
  version: "1.0.0-draft",
  draft: true,
  traits: {
    O: {
      name: "Openness",
      cards: {
        higher: {
          title: "You enjoy new ideas",
          note: "You like exploring new ideas and different ways of doing things.",
          tip: "Pick one idea this week and try it out for real.",
        },
        middle: {
          title: "Balance: new and familiar",
          note: "You mix fresh ideas with ways that are known to work.",
          tip: "When something feels stuck, ask what a different way might look like.",
        },
        lower: {
          title: "You like what works",
          note: "You prefer proven, practical ways, which makes you dependable.",
          tip: "Once in a while, try one small thing in a different way.",
        },
      },
    },
    C: {
      name: "Conscientiousness",
      cards: {
        higher: {
          title: "You follow through",
          note: "You plan ahead and finish what you start.",
          tip: "Leave some room in your plan for surprises and rest.",
        },
        middle: {
          title: "Balance: plan and flow",
          note: "You can plan when it matters and go with the flow when it does not.",
          tip: "Pick the one task that matters most today and do it first.",
        },
        lower: {
          title: "You stay flexible",
          note: "You adapt easily and do not get stuck on rigid plans.",
          tip: "Break a big task into small steps and tick them off one by one.",
        },
      },
    },
    E: {
      name: "Extraversion",
      cards: {
        higher: {
          title: "You gain energy from people",
          note: "You enjoy company, talking and being where the action is.",
          tip: "Make time to listen as well as talk, and give yourself quiet time too.",
        },
        middle: {
          title: "Balance: people and quiet",
          note: "You are comfortable in a group and also happy on your own.",
          tip: "Notice which setting helps you do your best work, and choose it more often.",
        },
        lower: {
          title: "You think things through",
          note: "You prefer smaller groups or time alone, and you often think before you speak.",
          tip: "Share one thought out loud in a group this week.",
        },
      },
    },
    A: {
      name: "Agreeableness",
      cards: {
        higher: {
          title: "You care about others",
          note: "You are warm, helpful and easy to work with.",
          tip: "It is fine to say no sometimes. Your needs matter too.",
        },
        middle: {
          title: "Balance: kind and direct",
          note: "You can be kind and also say what you think.",
          tip: "Practise saying your view calmly when you disagree.",
        },
        lower: {
          title: "You speak your mind",
          note: "You are direct and you question things, which helps in making tough calls.",
          tip: "Before you reply, try to hear the other person's side first.",
        },
      },
    },
    N: {
      name: "Emotional steadiness",
      cards: {
        higher: {
          title: "You stay calm",
          note: "You usually stay steady when things get stressful.",
          tip: "Check in on friends who find stress harder. Your calm can help them.",
        },
        middle: {
          title: "Balance: calm and alert",
          note: "You stay steady most days and notice stress when it builds.",
          tip: "Take a short break when things pile up, before it feels like too much.",
        },
        lower: {
          title: "You feel things deeply",
          note: "You notice stress and strong feelings quickly, which can make you caring and alert.",
          tip: "When things pile up, take a few slow breaths or a short walk.",
        },
      },
    },
  },
  interests: {
    R: { name: "Realistic", description: "Hands-on work: tools, machines, building and the outdoors." },
    I: { name: "Investigative", description: "Figuring things out: research, puzzles, data and how things work." },
    A: { name: "Artistic", description: "Creating: design, writing, music and original ideas." },
    S: { name: "Social", description: "Helping people: teaching, caring, guiding and working together." },
    E: { name: "Enterprising", description: "Leading and persuading: starting things, selling and taking charge." },
    C: { name: "Conventional", description: "Organising: keeping things accurate, tidy and running smoothly." },
  },
  // DRAFT persona wording of our own (D81, D88): names, taglines and blocks are for the client to approve or replace.
  personas: {
    R: {
      name: "The Hands-On Builder",
      tagline: "You like to make things work and see the result with your own eyes.",
      strengths: [
        { title: "Practical", note: "You prefer real things you can try, fix or build over long talk." },
        { title: "Steady under pressure", note: "You stay focused on the task when others get distracted." },
        { title: "Good with tools and systems", note: "You pick up how machines and setups work quickly." },
      ],
      growth: [
        { title: "Share your plan", note: "Tell people what you are making and why, so they can help you." },
        { title: "Try something new", note: "Once in a while, take on a job outside your usual comfort zone." },
      ],
    },
    I: {
      name: "The Curious Thinker",
      tagline: "You want to know how and why things work, and you enjoy finding the answer.",
      strengths: [
        { title: "Asks good questions", note: "You look past the obvious and dig into what is really going on." },
        { title: "Analytical", note: "You like to break a problem into parts and work through it." },
        { title: "Learns on your own", note: "You can teach yourself a new topic when it interests you." },
      ],
      growth: [
        { title: "Turn ideas into action", note: "Set a small deadline so a good idea becomes something you finish." },
        { title: "Explain it simply", note: "Practise sharing what you found in plain words for other people." },
      ],
    },
    A: {
      name: "The Imaginative Creator",
      tagline: "You see new ways to say, make and design things, and you like to express yourself.",
      strengths: [
        { title: "Original ideas", note: "You come up with fresh angles that other people do not think of." },
        { title: "Expressive", note: "You can show a feeling or an idea through words, images or sound." },
        { title: "Sees the big picture", note: "You notice the look and feel of things, not only the facts." },
      ],
      growth: [
        { title: "Finish what you start", note: "Pick one idea and take it all the way to a finished piece." },
        { title: "Welcome feedback", note: "Ask a friend what works and what does not, then use it to improve." },
      ],
    },
    S: {
      name: "The Caring Helper",
      tagline: "You get energy from supporting people and helping them grow.",
      strengths: [
        { title: "Good listener", note: "People feel heard when they talk to you." },
        { title: "Works well in a team", note: "You help a group get along and share the work fairly." },
        { title: "Patient teacher", note: "You can explain things kindly and at the other person's pace." },
      ],
      growth: [
        { title: "Look after yourself too", note: "Make time for your own needs, not only everyone else's." },
        { title: "Say no kindly", note: "You do not have to help with everything. Pick what matters most." },
      ],
    },
    E: {
      name: "The Bold Leader",
      tagline: "You like to start things, take charge and bring people along with you.",
      strengths: [
        { title: "Takes initiative", note: "You step forward when something needs to get going." },
        { title: "Persuasive", note: "You can explain an idea in a way that makes people want to join in." },
        {
          title: "Comfortable with risk",
          note: "You are willing to try something even when the result is not certain.",
        },
      ],
      growth: [
        { title: "Listen before you lead", note: "Ask for other views first, then decide." },
        { title: "Plan the details", note: "Pair your big goals with a few clear steps so nothing slips." },
      ],
    },
    C: {
      name: "The Steady Organiser",
      tagline: "You like things clear, accurate and in good order, and others can count on you.",
      strengths: [
        { title: "Careful and accurate", note: "You notice details and catch mistakes before they cause trouble." },
        { title: "Reliable", note: "When you say you will do something, it gets done." },
        { title: "Good at systems", note: "You make a tidy plan, a list or a routine that keeps work running." },
      ],
      growth: [
        {
          title: "Be open to change",
          note: "Try a new way of doing something now and then, even if the old way works.",
        },
        {
          title: "Speak up with ideas",
          note: "Share your suggestions, since your careful thinking is useful to others.",
        },
      ],
    },
    explorer: {
      name: "The Open-Minded Explorer",
      tagline: "Many kinds of work interest you, which is a good place to start trying things out.",
      strengths: [
        {
          title: "Curious about a lot",
          note: "You can see yourself in several kinds of work, so you keep your options open.",
        },
        { title: "Adaptable", note: "You can settle into new people, places and tasks without much trouble." },
        { title: "Fresh eyes", note: "You bring ideas from one area into another." },
      ],
      growth: [
        { title: "Try a few small things", note: "Test two or three areas for a week each and notice what you enjoy." },
        {
          title: "Notice what energises you",
          note: "After each try, write down what felt easy and what felt like a chore.",
        },
      ],
    },
  },
  careerFamilies: CAREER_FAMILIES_1_0_0,
  tryFirstLabel: "Try this first",
  closeNote: "Your top three interests are close together. Treat them as a shortlist to explore, not a ranking.",
  flatNote:
    "Your interests are spread evenly, so no single area stands out. That is fine: explore a few and see what feels right.",
  footer:
    "This is a first look based on a few questions. It is not a diagnosis, a clinical test or a validated test. The interest areas are based on Holland's six interest types.",
};

/** Every wording version that ever shipped, by version. Never remove an entry that real results used. */
export const REPORT_COPIES: Readonly<Record<string, ReportCopy>> = {
  [REPORT_COPY_1_0_0_DRAFT.version]: REPORT_COPY_1_0_0_DRAFT,
};

/** New results are stamped with this version when the attempt finishes. */
export const CURRENT_REPORT_COPY: ReportCopy = REPORT_COPY_1_0_0_DRAFT;

export function getReportCopy(version: string): ReportCopy | undefined {
  return Object.hasOwn(REPORT_COPIES, version) ? REPORT_COPIES[version] : undefined;
}
