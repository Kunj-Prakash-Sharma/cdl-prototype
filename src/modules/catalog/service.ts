// PUBLIC interface of modules/catalog. Other modules and pages import only this file.
import { getCourse } from "./courses";

export { coursesForInterests } from "./suggestions";
/** True when the slug is in the course list (courses are still static data, D67). */
export const courseExists = (slug: string): boolean => getCourse(slug) !== undefined;
export type { CourseSuggestion, RiasecType } from "./suggestions";

// Video lessons (docs/specs/video.md). Admin functions assume the caller already ran requireAdmin().
export { VIDEO_PURGE_JOB, videoPurgeHandler } from "./jobs";
export {
  completeVideoUpload,
  createLesson,
  listLessons,
  moveLesson,
  setPublished,
  startVideoUpload,
  updateLesson,
} from "./lessons";
export { getPlayback, listProgress, saveProgress } from "./playback";
export type {
  CatalogErrorCode,
  CatalogResult,
  LessonView,
  PlaybackResult,
  ProgressView,
  VideoStateView,
} from "./types";
