import { CAREERS, type Career } from "./data/careers";
import { COURSES, type Course } from "./data/courses";
import {
  APTITUDE_QUESTIONS,
  APTITUDE_SKILL_LABEL,
  DIMENSIONS,
  DIMENSION_INFO,
  INTERESTS,
  LIKERT_ITEMS,
  STRENGTHS,
  VALUES_TO_PICK,
  WORK_VALUES,
  type AptitudeSkill,
  type Dimension,
  type WorkValue,
} from "./data/discovery";
import type { AppState } from "./store";

export type CareerMatch = { career: Career; fit: number; reasons: string[] };
export type Insight = { title: string; detail: string; source?: string };
export type SkillScore = { skill: AptitudeSkill; label: string; correct: number; total: number; pct: number };

export type Results = {
  name: string;
  scores: Record<Dimension, number>;
  ranked: Dimension[];
  code: Dimension[];
  archetype: { title: string; summary: string };
  aptitude: { correct: number; total: number; pct: number; percentile: string; bySkill: SkillScore[] };
  values: WorkValue[];
  strengths: Insight[];
  growth: Insight[];
  matches: CareerMatch[];
  courses: { course: Course; career: Career; fit: number }[];
};

const SECONDARY_FLAVOR: Record<Dimension, string> = {
  R: "You balance it with a practical, get-it-done streak.",
  I: "Underneath it all is a curious mind that wants to know how things really work.",
  A: "You pair it with a creative streak that makes your work stand out.",
  S: "And you care deeply about how your work affects the people around you.",
  E: "Add a drive to lead and make things happen, and you're hard to stop.",
  C: "You back it up with structure and a sharp eye for detail.",
};

export function discoveryProgress(s: AppState) {
  const chat = Math.min(s.chatStep, 6) / 6;
  const likert = LIKERT_ITEMS.filter((i) => s.likert[i.id]).length / LIKERT_ITEMS.length;
  const apt = APTITUDE_QUESTIONS.filter((q) => q.id in s.aptitude).length / APTITUDE_QUESTIONS.length;
  const values = Math.min(s.values.length, VALUES_TO_PICK) / VALUES_TO_PICK;
  return { chat, likert, apt, values, overall: (chat + likert + apt + values) / 4 };
}

export function isDiscoveryComplete(s: AppState) {
  return discoveryProgress(s).overall >= 1;
}

function zeroDims(): Record<Dimension, number> {
  return { R: 0, I: 0, A: 0, S: 0, E: 0, C: 0 };
}

function cosine(a: Record<Dimension, number>, b: Record<Dimension, number>) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const d of DIMENSIONS) {
    dot += a[d] * b[d];
    na += a[d] * a[d];
    nb += b[d] * b[d];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function computeResults(s: AppState): Results {
  const interests = s.profile.interests ?? [];
  const strengths = s.profile.strengths ?? [];

  // 1. Interest profile — Likert answers, nudged by self-reported interests & strengths.
  const sums = zeroDims();
  const counts = zeroDims();
  for (const item of LIKERT_ITEMS) {
    sums[item.dim] += s.likert[item.id] ?? 3;
    counts[item.dim] += 1;
  }
  const boost = zeroDims();
  for (const opt of [...INTERESTS.filter((o) => interests.includes(o.id)), ...STRENGTHS.filter((o) => strengths.includes(o.id))]) {
    for (const [d, w] of Object.entries(opt.dims ?? {})) boost[d as Dimension] += w;
  }
  const maxBoost = Math.max(1, ...Object.values(boost));
  const scores = zeroDims();
  for (const d of DIMENSIONS) {
    const likert = (sums[d] / counts[d] - 1) / 4;
    scores[d] = clamp(Math.round(100 * (0.75 * likert + 0.25 * (boost[d] / maxBoost))), 5, 98);
  }
  const ranked = [...DIMENSIONS].sort((a, b) => scores[b] - scores[a]);
  const [top, second] = ranked;

  // 2. Aptitude
  const skills = Object.keys(APTITUDE_SKILL_LABEL) as AptitudeSkill[];
  const bySkill: SkillScore[] = skills.map((skill) => {
    const qs = APTITUDE_QUESTIONS.filter((q) => q.skill === skill);
    const correct = qs.filter((q) => s.aptitude[q.id] === q.answer).length;
    return { skill, label: APTITUDE_SKILL_LABEL[skill], correct, total: qs.length, pct: Math.round((correct / qs.length) * 100) };
  });
  const correct = bySkill.reduce((n, x) => n + x.correct, 0);
  const total = APTITUDE_QUESTIONS.length;
  const ratio = correct / total;
  const percentile =
    ratio === 1 ? "Top 5%" : ratio >= 0.83 ? "Top 15%" : ratio >= 0.66 ? "Top 30%" : ratio >= 0.5 ? "Top 50%" : "Building up";

  // 3. Values
  const values = s.values.map((id) => WORK_VALUES.find((v) => v.id === id)).filter((v): v is WorkValue => !!v);

  // 4. Strengths & growth areas
  const best = [...bySkill].sort((a, b) => b.pct - a.pct)[0];
  const weakest = [...bySkill].sort((a, b) => a.pct - b.pct)[0];
  const firstStrength = STRENGTHS.find((o) => o.id === strengths[0]);
  const strengthInsights: Insight[] = [
    { ...DIMENSION_INFO[top].strength, source: "Interest profile" },
    { ...DIMENSION_INFO[second].strength, source: "Interest profile" },
    best.pct === 100
      ? {
          title: `Strong ${best.label.toLowerCase()}`,
          detail: `You aced every ${best.label.toLowerCase()} question — a real asset for analytical, problem-solving roles.`,
          source: "Aptitude quiz",
        }
      : {
          title: firstStrength?.label ?? "Self-awareness",
          detail: "You told Sage this is what people come to you for, and your assessment answers back it up.",
          source: "Conversation",
        },
  ];
  const growthInsights: Insight[] = [
    DIMENSION_INFO[ranked[5]].growth,
    DIMENSION_INFO[ranked[4]].growth,
    weakest.pct < 100
      ? {
          title: `Sharpen ${weakest.label.toLowerCase()}`,
          detail: "Short daily practice — puzzles, case problems, timed drills — compounds quickly into confidence.",
        }
      : {
          title: "Portfolio & visibility",
          detail: "Turn your skills into visible proof with projects, case studies and a strong online profile.",
        },
  ];

  // 5. Career matches
  const matches: CareerMatch[] = CAREERS.map((career) => {
    const interestHits = career.interests.filter((i) => interests.includes(i));
    const valueHits = career.values.filter((v) => s.values.includes(v));
    const strengthHits = career.strengths.filter((x) => strengths.includes(x));
    const raw =
      0.65 * cosine(scores, career.dims) +
      0.22 * Math.min(1, interestHits.length / Math.min(3, career.interests.length)) +
      0.13 * (valueHits.length / VALUES_TO_PICK);
    const fit = clamp(Math.round(40 + raw * 60), 45, 98);

    const reasons: string[] = [];
    const dimHit = ranked.slice(0, 3).find((d) => career.dims[d] >= 0.7);
    if (dimHit) reasons.push(`Suits your ${DIMENSION_INFO[dimHit].adjective.toLowerCase()} side (${DIMENSION_INFO[dimHit].name})`);
    if (interestHits[0]) reasons.push(`Builds on your interest in ${INTERESTS.find((o) => o.id === interestHits[0])?.label.toLowerCase()}`);
    if (valueHits[0]) reasons.push(`Offers the ${WORK_VALUES.find((v) => v.id === valueHits[0])?.label.toLowerCase()} you value most`);
    if (strengthHits[0] && reasons.length < 3)
      reasons.push(`Uses your strength in ${STRENGTHS.find((o) => o.id === strengthHits[0])?.label.toLowerCase()}`);
    if (reasons.length === 0) reasons.push(career.blurb);
    return { career, fit, reasons: reasons.slice(0, 3) };
  })
    .sort((a, b) => b.fit - a.fit)
    .slice(0, 5);

  // 6. Learning path — interleave the top three careers' courses for variety.
  const picked: { course: Course; career: Career; fit: number }[] = [];
  const top3 = matches.slice(0, 3);
  for (let round = 0; round < 3 && picked.length < 3; round++) {
    for (const m of top3) {
      const slug = m.career.courses[round];
      const course = COURSES.find((c) => c.slug === slug);
      if (course && !picked.some((p) => p.course.slug === slug) && picked.length < 3) {
        picked.push({ course, career: m.career, fit: m.fit });
      }
    }
  }

  return {
    name: s.profile.name ?? "there",
    scores,
    ranked,
    code: ranked.slice(0, 3),
    archetype: {
      title: `The ${DIMENSION_INFO[second].adjective} ${DIMENSION_INFO[top].noun}`,
      summary: `${DIMENSION_INFO[top].summary} ${SECONDARY_FLAVOR[second]}`,
    },
    aptitude: { correct, total, pct: Math.round(ratio * 100), percentile, bySkill },
    values,
    strengths: strengthInsights,
    growth: growthInsights,
    matches,
    courses: picked,
  };
}
