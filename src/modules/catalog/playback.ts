// Who may watch, the signed URL, resume position and progress (docs/specs/video.md). The access rule lives in
// rules.ts (pure); this file loads the facts, applies it, then rate-limits and asks the video adapter.
// No URL is stored anywhere and the watermark id is never logged or sent to analytics.
import { video } from "@/integrations/video";
import { getWatermarkId } from "@/modules/auth/service";
import { hasAccess } from "@/modules/commerce/service";
import { trackVideo } from "./events";
import { anonPlaybackLimiter, PLAYBACK_URL_SEC, progressLimiter, userPlaybackLimiter } from "./limits";
import * as repo from "./repo";
import { clampPosition, decideAccess, isCompleted, resumePosition } from "./rules";
import * as s from "./schemas";
import type { AccessFailCode, CatalogResult, PlaybackResult, ProgressView } from "./types";

type Gate = { ok: true; lesson: repo.LessonRow; current: repo.VideoRow } | { ok: false; code: AccessFailCode };

/** Loads the lesson and applies the one access rule. `userId` is null for a visitor who is not logged in (a guest counts as logged out). */
async function checkAccess(lessonId: string, userId: string | null): Promise<Gate> {
  const lesson = await repo.getLesson(lessonId);
  if (!lesson) return { ok: false, code: "not_found" };
  const current = await repo.getCurrentVideo(lesson);
  const hasReadyVideo = current?.state === "ready";
  const entitled = !lesson.isPreview && userId ? await hasAccess(userId, lesson.courseSlug) : false;
  const decision = decideAccess({
    published: lesson.publishedAt !== null,
    hasReadyVideo,
    isPreview: lesson.isPreview,
    loggedIn: userId !== null,
    entitled,
  });
  if (!decision.ok) return decision;
  return { ok: true, lesson, current: current! };
}

/**
 * A signed, expiring playback URL for a lesson, after the access check and the rate limit (the limit runs before the
 * video adapter is touched). Previews play without a login; anonymous previews carry no watermark.
 */
export async function getPlayback(input: {
  lessonId: string;
  userId: string | null;
  ip: string;
  anonymousId?: string;
}): Promise<PlaybackResult> {
  if (!s.lessonId.safeParse(input.lessonId).success) return { ok: false, code: "not_found" };
  const gate = await checkAccess(input.lessonId, input.userId);
  if (!gate.ok) return gate;
  const { lesson, current } = gate;

  const limit = input.userId
    ? userPlaybackLimiter.hit(`user:${input.userId}`, Date.now())
    : anonPlaybackLimiter.hit(`ip:${input.ip}`, Date.now());
  if (!limit.ok) return { ok: false, code: "rate_limited", retryAfterSec: limit.retryAfterSec };

  const { url, expiresAt } = await video.getPlayback({
    providerRef: current.providerRef,
    expiresInSec: PLAYBACK_URL_SEC,
  });

  let watermarkId: string | null = null;
  let resumeSec = 0;
  if (input.userId) {
    watermarkId = await getWatermarkId(input.userId);
    const saved = await repo.getProgress(input.userId, lesson.id);
    resumeSec = resumePosition(saved?.positionSec, current.durationSec ?? 0);
  } else if (lesson.isPreview) {
    const anonymousId = s.getPlaybackInput.shape.anonymousId.safeParse(input.anonymousId);
    if (anonymousId.success && anonymousId.data) {
      trackVideo(anonymousId.data, "preview_played", { courseId: lesson.courseSlug });
    }
  }
  return { ok: true, url, expiresAt: expiresAt.toISOString(), resumeSec, watermarkId };
}

/**
 * Saves where the learner stopped. Same access rule as playback (the id comes from the session, never the client).
 * The position is clamped to the video length; 90% marks the lesson complete once and it is never cleared.
 */
export async function saveProgress(input: {
  userId: string;
  lessonId: string;
  positionSec: number;
}): Promise<CatalogResult> {
  const parsed = s.saveProgressInput.safeParse({ lessonId: input.lessonId, positionSec: input.positionSec });
  if (!parsed.success || !input.userId) return { ok: false, code: "invalid_input" };
  const { lessonId, positionSec } = parsed.data;

  const gate = await checkAccess(lessonId, input.userId);
  if (!gate.ok) return gate;
  const limit = progressLimiter.hit(`user:${input.userId}`, Date.now());
  if (!limit.ok) return { ok: false, code: "rate_limited", retryAfterSec: limit.retryAfterSec };

  const durationSec = gate.current.durationSec ?? 0;
  const position = clampPosition(positionSec, durationSec);
  const now = new Date();
  await repo.upsertPosition(input.userId, lessonId, position, now);
  if (durationSec > 0 && isCompleted(position, durationSec)) {
    if (await repo.markCompletedOnce(input.userId, lessonId, now)) {
      trackVideo(input.userId, "lesson_completed", { courseId: gate.lesson.courseSlug, lessonId });
    }
  }
  return { ok: true };
}

/** A learner's saved positions for one course, by lesson id. */
export async function listProgress(userId: string, courseSlug: string): Promise<Map<string, ProgressView>> {
  const rows = await repo.listProgressForCourse(userId, courseSlug);
  return new Map(rows.map((r) => [r.lessonId, { positionSec: r.positionSec, completed: r.completedAt !== null }]));
}
