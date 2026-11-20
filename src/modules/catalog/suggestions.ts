// Pure course suggestions (no database), split out of service.ts so it can be unit-tested and imported without server config.
// Re-exported by service.ts, the PUBLIC interface of modules/catalog for other modules. Courses are static sample data for now (D67); the real
// catalog (E7) will sit behind the same functions. The result carries only plain fields (no icon component), so it
// can be handed from a server page to a client component.
import { COURSES, type Course, type RiasecType } from "./courses";

export type { RiasecType } from "./courses";
export type CourseSuggestion = { slug: string; title: string; tagline: string };

/** Points for a course type that matches the learner's 1st, 2nd and 3rd interest. */
const RANK_POINTS = [3, 2, 1] as const;

const slim = ({ slug, title, tagline }: Course): CourseSuggestion => ({ slug, title, tagline });

const mostPopular = (limit: number) =>
  [...COURSES]
    .sort((a, b) => b.learners - a.learners || a.slug.localeCompare(b.slug))
    .slice(0, limit)
    .map(slim);

/**
 * Courses that suit the learner's top interests, best match first. `types` is the Holland code in rank order. A course
 * scores points for each of its types found in the code (more for a higher rank); ties go to the more popular course.
 * With no code (a flat profile) or no match, it falls back to the most popular courses and says so.
 */
export function coursesForInterests(
  types: readonly RiasecType[],
  limit = 3,
): { courses: CourseSuggestion[]; fallback: boolean } {
  const points = (course: Course) =>
    course.riasecTypes.reduce((sum, type) => {
      const rank = types.indexOf(type);
      return rank === -1 ? sum : sum + (RANK_POINTS[rank] ?? 0);
    }, 0);
  const ranked = COURSES.map((course) => ({ course, points: points(course) }))
    .filter((entry) => entry.points > 0)
    .sort(
      (a, b) =>
        b.points - a.points || b.course.learners - a.course.learners || a.course.slug.localeCompare(b.course.slug),
    )
    .slice(0, limit);
  if (ranked.length === 0) return { courses: mostPopular(limit), fallback: true };
  return { courses: ranked.map((entry) => slim(entry.course)), fallback: false };
}
