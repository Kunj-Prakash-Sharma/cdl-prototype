// Pure helper for scripts/seed.ts: turns a static course's modules into flat lesson rows (docs/specs/video.md,
// "Dev data"). Lessons are flat per course, so the modules are flattened in order; title and the preview flag are kept
// and `minutes` becomes seconds.
import { allLessons, type Course } from "./courses";

export type SeedLesson = { position: number; title: string; isPreview: boolean; durationSec: number };

export function seedLessonsFor(course: Course): SeedLesson[] {
  return allLessons(course).map((lesson, index) => ({
    position: index + 1,
    title: lesson.title,
    isPreview: lesson.preview,
    durationSec: Math.max(1, Math.round(lesson.minutes * 60)),
  }));
}
