// Zod schemas for the video feature's inputs (docs/specs/video.md, "Zod at every boundary"). Shared by the service and
// the server actions, so the limits are written once.
import { z } from "zod";
import { getCourse } from "./courses";
import { MAX_DURATION_SEC, MAX_TITLE_LENGTH, MAX_VIDEO_BYTES } from "./limits";

export const lessonId = z.uuid();
export const videoId = z.uuid();
export const title = z.string().trim().min(1).max(MAX_TITLE_LENGTH);
export const courseSlug = z.string().refine((slug) => getCourse(slug) !== undefined, "unknown course");
export const sizeBytes = z.number().int().min(1).max(MAX_VIDEO_BYTES);
export const durationSec = z.number().int().min(1).max(MAX_DURATION_SEC);
export const positionSec = z.number().int().min(0);

export const createLessonInput = z.object({ courseSlug, title });
export const updateLessonInput = z.object({
  lessonId,
  title: title.optional(),
  isPreview: z.boolean().optional(),
});
export const moveLessonInput = z.object({ lessonId, direction: z.enum(["up", "down"]) });
export const setPublishedInput = z.object({ lessonId, published: z.boolean() });
export const startVideoUploadInput = z.object({ lessonId, sizeBytes });
export const completeVideoUploadInput = z.object({ videoId, durationSec });
export const saveProgressInput = z.object({ lessonId, positionSec });
export const getPlaybackInput = z.object({ lessonId, anonymousId: z.uuid().optional() });
