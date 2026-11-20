// DATA ONLY: example career FAMILIES for each Holland interest type, shown in the report (assessment.md section 8).
// Families are broad areas of work. No job profiles, no salary, no fit percentage (D72, CLAUDE.md).
// DRAFT wording of our own: the client has not approved this list (open-questions.md). It is part of a report wording
// version (report-copy.ts), so editing a shipped list means a new version, never an edit in place.
import type { RiasecDimension } from "./question-set";

export type CareerFamilies = Readonly<Record<RiasecDimension, readonly string[]>>;

export const CAREER_FAMILIES_1_0_0: CareerFamilies = {
  R: [
    "Engineering and technical trades",
    "Farming, forests and the environment",
    "Sports, fitness and the outdoors",
    "Transport, travel and logistics",
  ],
  I: ["Data and analytics", "Software and technology", "Science and research", "Medicine and health research"],
  A: [
    "Design and creative arts",
    "Media, writing and content",
    "Film, music and performance",
    "Architecture and interiors",
  ],
  S: [
    "Teaching and training",
    "Counselling and social work",
    "Healthcare and caring roles",
    "People and community work",
  ],
  E: [
    "Business and starting your own venture",
    "Sales and marketing",
    "Management and leadership",
    "Law, public service and policy",
  ],
  C: [
    "Accounting and finance",
    "Banking and insurance",
    "Office and operations management",
    "Quality, records and compliance",
  ],
};
