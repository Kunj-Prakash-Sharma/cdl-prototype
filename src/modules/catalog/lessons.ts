// Admin and listing logic for lessons and video uploads (docs/specs/video.md). The server action calls requireAdmin()
// before any admin function here; this file trusts that and checks inputs and rules only.
import { randomUUID } from "node:crypto";
import { video } from "@/integrations/video";
import { queue } from "@/integrations/queue";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { PURGE_DELAY_SEC } from "./limits";
import { VIDEO_PURGE_JOB } from "./jobs";
import * as repo from "./repo";
import * as s from "./schemas";
import type { CatalogResult, LessonView, VideoStateView } from "./types";

function toView(lesson: repo.LessonRow, videos: repo.VideoRow[]): LessonView {
  const mine = videos.filter((v) => v.lessonId === lesson.id); // newest first
  const current = mine.find((v) => v.id === lesson.currentVideoId);
  const shown = current ?? mine[0];
  const videoState: VideoStateView = current ? "ready" : (shown?.state ?? "none");
  return {
    id: lesson.id,
    courseSlug: lesson.courseSlug,
    title: lesson.title,
    position: lesson.position,
    isPreview: lesson.isPreview,
    published: lesson.publishedAt !== null,
    durationSec: current?.durationSec ?? null,
    videoState,
    fastStart: current?.fastStart ?? null,
  };
}

/** Published lessons only, unless the admin page asks for drafts too. Ordered by position. */
export async function listLessons(courseSlug: string, opts: { includeDraft?: boolean } = {}): Promise<LessonView[]> {
  const rows = await repo.listLessonRows(courseSlug, opts.includeDraft ?? false);
  const videos = await repo.listVideosForLessons(rows.map((r) => r.id));
  return rows.map((row) => toView(row, videos));
}

export async function createLesson(input: unknown): Promise<CatalogResult<{ lessonId: string }>> {
  const parsed = s.createLessonInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const lessonId = await repo.insertLessonAtEnd(parsed.data.courseSlug, parsed.data.title);
  return { ok: true, lessonId };
}

export async function updateLesson(input: unknown): Promise<CatalogResult> {
  const parsed = s.updateLessonInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const { lessonId, title, isPreview } = parsed.data;
  if (title === undefined && isPreview === undefined) return { ok: false, code: "invalid_input" };
  const found = await repo.updateLessonFields(lessonId, {
    ...(title !== undefined && { title }),
    ...(isPreview !== undefined && { isPreview }),
  });
  return found ? { ok: true } : { ok: false, code: "not_found" };
}

export async function moveLesson(input: unknown): Promise<CatalogResult> {
  const parsed = s.moveLessonInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const found = await repo.moveLessonInCourse(parsed.data.lessonId, parsed.data.direction);
  return found ? { ok: true } : { ok: false, code: "not_found" };
}

/** Publishing needs a ready current video. Unpublishing is always allowed (a learner holding a URL keeps playing until it expires). */
export async function setPublished(input: unknown): Promise<CatalogResult> {
  const parsed = s.setPublishedInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const { lessonId, published } = parsed.data;
  if (!published) {
    return (await repo.unpublishLesson(lessonId)) ? { ok: true } : { ok: false, code: "not_found" };
  }
  const outcome = await repo.publishLesson(lessonId, new Date());
  return outcome === "ok" ? { ok: true } : { ok: false, code: outcome };
}

/**
 * Step 1 of an upload: validate the size, ask the video adapter for an upload URL, remember the video as "uploading".
 * (The adapter is asked first so the row is written once with its `provider_ref`; if the adapter fails, no row exists.)
 */
export async function startVideoUpload(input: unknown): Promise<CatalogResult<{ videoId: string; uploadUrl: string }>> {
  const parsed = s.startVideoUploadInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const { lessonId, sizeBytes } = parsed.data;
  const lesson = await repo.getLesson(lessonId);
  if (!lesson) return { ok: false, code: "not_found" };

  const videoId = randomUUID();
  const { providerRef, uploadUrl } = await video.createUpload({ videoId, contentType: "video/mp4", sizeBytes });
  await repo.insertVideo({
    id: videoId,
    lessonId,
    provider: env.VIDEO_PROVIDER,
    providerRef,
    declaredSizeBytes: sizeBytes,
  });
  return { ok: true, videoId, uploadUrl };
}

/**
 * Step 3 of an upload (after the browser PUT): check the file with the adapter, then make it the lesson's current
 * video. A missing, empty or wrong-sized file marks the video failed and leaves the old video live. A fast-start
 * warning (`fastStart: false`) is returned, never blocks.
 */
export async function completeVideoUpload(input: unknown): Promise<CatalogResult<{ fastStart: boolean }>> {
  const parsed = s.completeVideoUploadInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const { videoId, durationSec } = parsed.data;

  const row = await repo.getVideo(videoId);
  if (!row) return { ok: false, code: "not_found" };
  if (row.state !== "uploading") return { ok: false, code: "invalid_state" };

  let checked;
  try {
    checked = await video.markReady(row.providerRef);
  } catch (err) {
    // Storage hiccup: leave the row "uploading" so the admin can press complete again.
    logger.error("video markReady threw", { videoId, errorName: err instanceof Error ? err.name : "unknown" });
    return { ok: false, code: "upload_failed" };
  }
  if (!checked.ok || checked.sizeBytes !== row.declaredSizeBytes) {
    await repo.markVideoFailed(videoId);
    logger.warn("video upload failed the check", { videoId, lessonId: row.lessonId });
    return { ok: false, code: "upload_failed" };
  }

  const outcome = await repo.promoteVideo(
    videoId,
    { sizeBytes: checked.sizeBytes, fastStart: checked.fastStart, durationSec },
    new Date(),
  );
  if (!outcome.ok) return { ok: false, code: outcome.reason === "not_found" ? "not_found" : "invalid_state" };

  if (outcome.oldVideoId) {
    // After the commit. If queueing fails the swap is still good; the old file is left for the follow-up sweep.
    try {
      await queue.enqueue(
        VIDEO_PURGE_JOB,
        { videoId: outcome.oldVideoId },
        { delaySec: PURGE_DELAY_SEC, singletonKey: `purge:${outcome.oldVideoId}` },
      );
    } catch (err) {
      logger.error("could not queue video purge", {
        videoId: outcome.oldVideoId,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
  }
  return { ok: true, fastStart: outcome.fastStart };
}
