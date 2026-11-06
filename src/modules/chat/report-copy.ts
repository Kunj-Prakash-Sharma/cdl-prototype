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

export type ReportCopy = {
  version: string;
  /** True until the client's approved wording replaces this text. Shown on the report as a visible tag. */
  draft: boolean;
  traits: Record<OceanDimension, TraitCopy>;
  interests: Record<RiasecDimension, InterestCopy>;
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
