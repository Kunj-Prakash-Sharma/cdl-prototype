import type { LucideIcon } from "lucide-react";
import {
  Award,
  Compass,
  HandHeart,
  Palette,
  Scale,
  ShieldCheck,
  Sprout,
  Wallet,
} from "lucide-react";

/** Holland (RIASEC) interest dimensions used by the psychometric assessment. */
export type Dimension = "R" | "I" | "A" | "S" | "E" | "C";
export const DIMENSIONS: Dimension[] = ["R", "I", "A", "S", "E", "C"];

export type DimensionInfo = {
  name: string;
  alias: string;
  noun: string;
  adjective: string;
  summary: string;
  strength: { title: string; detail: string };
  growth: { title: string; detail: string };
};

export const DIMENSION_INFO: Record<Dimension, DimensionInfo> = {
  R: {
    name: "Realistic",
    alias: "Builder",
    noun: "Builder",
    adjective: "Hands-on",
    summary: "You learn by doing and love seeing tangible results from your work.",
    strength: {
      title: "Practical execution",
      detail: "You turn plans into working things and stay calm when something needs fixing.",
    },
    growth: {
      title: "Hands-on prototyping",
      detail: "Get comfortable building rough versions early instead of perfecting ideas on paper.",
    },
  },
  I: {
    name: "Investigative",
    alias: "Thinker",
    noun: "Analyst",
    adjective: "Analytical",
    summary: "You're driven by curiosity and enjoy untangling complex problems with logic and evidence.",
    strength: {
      title: "Analytical thinking",
      detail: "You break complex problems into parts and reason your way to evidence-backed answers.",
    },
    growth: {
      title: "Structured analysis",
      detail: "Practise forming a hypothesis, testing it with data and drawing a clear conclusion.",
    },
  },
  A: {
    name: "Artistic",
    alias: "Creator",
    noun: "Creator",
    adjective: "Creative",
    summary: "You think in possibilities and bring fresh, original ideas to everything you touch.",
    strength: {
      title: "Original ideas",
      detail: "You see angles others miss and can make ideas feel vivid, human and memorable.",
    },
    growth: {
      title: "Creative confidence",
      detail: "Share unfinished ideas sooner — sketches and drafts invite feedback that sharpens them.",
    },
  },
  S: {
    name: "Social",
    alias: "Helper",
    noun: "Mentor",
    adjective: "Empathetic",
    summary: "You're energised by people and find meaning in helping others learn and grow.",
    strength: {
      title: "Empathy & connection",
      detail: "People trust you. You listen closely and make others feel understood and supported.",
    },
    growth: {
      title: "Collaborative communication",
      detail: "Build habits for sharing your thinking out loud and inviting others into your work.",
    },
  },
  E: {
    name: "Enterprising",
    alias: "Persuader",
    noun: "Catalyst",
    adjective: "Enterprising",
    summary: "You like to lead, persuade and make things happen — momentum is your superpower.",
    strength: {
      title: "Initiative & influence",
      detail: "You rally people around a goal and aren't afraid to take a smart, calculated risk.",
    },
    growth: {
      title: "Leadership presence",
      detail: "Take ownership of small initiatives to practise pitching ideas and rallying a team.",
    },
  },
  C: {
    name: "Conventional",
    alias: "Organizer",
    noun: "Architect",
    adjective: "Systematic",
    summary: "You bring order to chaos and take pride in precise, reliable, well-structured work.",
    strength: {
      title: "Precision & structure",
      detail: "You create systems that keep work organised, accurate and on schedule.",
    },
    growth: {
      title: "Systems & detail",
      detail: "Adopt simple planning rituals — checklists, weekly reviews — to make big goals manageable.",
    },
  },
};

export type Option = { id: string; label: string; dims?: Partial<Record<Dimension, number>> };

export const JOURNEY_STAGES: Option[] = [
  { id: "school", label: "School student (Class 11–12)" },
  { id: "ug", label: "Undergraduate student" },
  { id: "pg", label: "Postgraduate student" },
  { id: "early", label: "Early-career professional" },
  { id: "switch", label: "Looking to switch careers" },
];

export const BACKGROUNDS: Option[] = [
  { id: "science", label: "Science" },
  { id: "commerce", label: "Commerce" },
  { id: "arts", label: "Arts & Humanities" },
  { id: "engineering", label: "Engineering & Technology" },
  { id: "design", label: "Design & Media" },
  { id: "business", label: "Business & Management" },
  { id: "other", label: "Something else" },
];

export const INTERESTS: Option[] = [
  { id: "tech", label: "Technology & coding", dims: { I: 2, R: 1 } },
  { id: "data", label: "Data & analytics", dims: { I: 2, C: 1 } },
  { id: "design", label: "Design & creativity", dims: { A: 2 } },
  { id: "business", label: "Business & startups", dims: { E: 2 } },
  { id: "health", label: "Healthcare & life sciences", dims: { I: 1, S: 1 } },
  { id: "psychology", label: "Psychology & people", dims: { S: 2 } },
  { id: "writing", label: "Writing & media", dims: { A: 2 } },
  { id: "finance", label: "Finance & markets", dims: { C: 1, E: 1 } },
  { id: "environment", label: "Environment & sustainability", dims: { R: 1, I: 1 } },
  { id: "teaching", label: "Teaching & education", dims: { S: 2 } },
  { id: "marketing", label: "Marketing & brands", dims: { E: 1, A: 1 } },
  { id: "engineering", label: "Building & engineering", dims: { R: 2 } },
];

export const STRENGTHS: Option[] = [
  { id: "problem", label: "Solving tricky problems", dims: { I: 2 } },
  { id: "explain", label: "Explaining ideas clearly", dims: { S: 1, A: 1 } },
  { id: "organize", label: "Organizing & planning", dims: { C: 2 } },
  { id: "creative", label: "Coming up with creative ideas", dims: { A: 2 } },
  { id: "lead", label: "Leading & motivating others", dims: { E: 2 } },
  { id: "empathy", label: "Listening & empathy", dims: { S: 2 } },
  { id: "numbers", label: "Working with numbers", dims: { C: 1, I: 1 } },
  { id: "hands", label: "Building & fixing things", dims: { R: 2 } },
];

export const GOALS: Option[] = [
  { id: "first-job", label: "Land my first job in a field I love" },
  { id: "switch", label: "Switch to a more fulfilling career" },
  { id: "grow", label: "Grow into a leadership role" },
  { id: "venture", label: "Build my own venture" },
  { id: "explore", label: "Not sure yet — help me explore" },
];

export function optionLabel(options: Option[], id: string | undefined) {
  return options.find((o) => o.id === id)?.label ?? id ?? "";
}

/* ---------------------------------------------------------------- */
/* Psychometric: RIASEC interest inventory (5-point Likert)          */
/* ---------------------------------------------------------------- */

export type LikertItem = { id: string; dim: Dimension; text: string };

export const LIKERT_ITEMS: LikertItem[] = [
  { id: "p1", dim: "I", text: "I love figuring out why things work the way they do." },
  { id: "p2", dim: "A", text: "I often come up with original ideas, designs or stories." },
  { id: "p3", dim: "S", text: "Helping someone learn or grow gives me real energy." },
  { id: "p4", dim: "E", text: "I enjoy persuading people and taking the lead on projects." },
  { id: "p5", dim: "C", text: "I like having clear processes and well-organised systems." },
  { id: "p6", dim: "R", text: "I enjoy building, fixing or assembling things with my hands." },
  { id: "p7", dim: "A", text: "I express myself through writing, art, music or design." },
  { id: "p8", dim: "I", text: "Analysing data or puzzles to find hidden patterns is fun for me." },
  { id: "p9", dim: "E", text: "I'm drawn to bold goals, even when they involve some risk." },
  { id: "p10", dim: "S", text: "Friends often come to me for advice or a listening ear." },
  { id: "p11", dim: "R", text: "I'd rather work with real tools and tangible things than abstract ideas." },
  { id: "p12", dim: "C", text: "I'm detail-oriented and enjoy getting things exactly right." },
];

export const LIKERT_SCALE = [
  { value: 1, label: "Strongly disagree" },
  { value: 2, label: "Disagree" },
  { value: 3, label: "Neutral" },
  { value: 4, label: "Agree" },
  { value: 5, label: "Strongly agree" },
];

/* ---------------------------------------------------------------- */
/* Aptitude quiz                                                     */
/* ---------------------------------------------------------------- */

export type AptitudeSkill = "Logical" | "Numerical" | "Verbal" | "Pattern";

export const APTITUDE_SKILL_LABEL: Record<AptitudeSkill, string> = {
  Logical: "Logical reasoning",
  Numerical: "Numerical ability",
  Verbal: "Verbal reasoning",
  Pattern: "Pattern recognition",
};

export type AptitudeQuestion = {
  id: string;
  skill: AptitudeSkill;
  prompt: string;
  options: string[];
  answer: number;
  explanation: string;
};

export const APTITUDE_QUESTIONS: AptitudeQuestion[] = [
  {
    id: "q1",
    skill: "Logical",
    prompt: "All designers are creative. Some creative people are engineers. Which statement must be true?",
    options: [
      "All designers are engineers",
      "Some engineers are designers",
      "Some creative people are designers",
      "No engineers are designers",
    ],
    answer: 2,
    explanation: "Every designer is creative, so at least some creative people are designers. The other options can't be proven.",
  },
  {
    id: "q2",
    skill: "Numerical",
    prompt: "A course priced at ₹2,400 is discounted by 25%. What is the new price?",
    options: ["₹1,600", "₹1,800", "₹1,900", "₹2,000"],
    answer: 1,
    explanation: "25% of ₹2,400 is ₹600, so the new price is ₹2,400 − ₹600 = ₹1,800.",
  },
  {
    id: "q3",
    skill: "Pattern",
    prompt: "What number comes next in the sequence?  2, 6, 12, 20, 30, …",
    options: ["36", "40", "42", "44"],
    answer: 2,
    explanation: "The gaps grow by 2 each time (+4, +6, +8, +10), so the next gap is +12 → 42.",
  },
  {
    id: "q4",
    skill: "Verbal",
    prompt: "Choose the word closest in meaning to “meticulous”.",
    options: ["Careless", "Thorough", "Hasty", "Generous"],
    answer: 1,
    explanation: "Meticulous means showing great attention to detail — thorough.",
  },
  {
    id: "q5",
    skill: "Logical",
    prompt: "If 5 machines take 5 minutes to make 5 widgets, how long would 100 machines take to make 100 widgets?",
    options: ["5 minutes", "20 minutes", "50 minutes", "100 minutes"],
    answer: 0,
    explanation: "Each machine makes one widget in 5 minutes, so 100 machines make 100 widgets in the same 5 minutes.",
  },
  {
    id: "q6",
    skill: "Numerical",
    prompt: "Team A finished 18 of 24 tasks. Team B finished 21 of 30. Which team has the higher completion rate?",
    options: ["Team A", "Team B", "They're equal", "Not enough information"],
    answer: 0,
    explanation: "Team A: 18 ÷ 24 = 75%. Team B: 21 ÷ 30 = 70%. Team A is ahead.",
  },
];

/* ---------------------------------------------------------------- */
/* Work values                                                       */
/* ---------------------------------------------------------------- */

export type WorkValue = { id: string; label: string; detail: string; icon: LucideIcon };

export const WORK_VALUES: WorkValue[] = [
  { id: "impact", label: "Impact", detail: "Work that makes a real difference", icon: HandHeart },
  { id: "creativity", label: "Creativity", detail: "Room to imagine and make new things", icon: Palette },
  { id: "growth", label: "Growth", detail: "Constantly learning and levelling up", icon: Sprout },
  { id: "stability", label: "Stability", detail: "Security and a predictable path", icon: ShieldCheck },
  { id: "autonomy", label: "Autonomy", detail: "Freedom to decide how I work", icon: Compass },
  { id: "income", label: "Income", detail: "Strong earning potential", icon: Wallet },
  { id: "recognition", label: "Recognition", detail: "Being seen and valued for my work", icon: Award },
  { id: "balance", label: "Balance", detail: "Time and energy for life outside work", icon: Scale },
];

export const VALUES_TO_PICK = 3;
