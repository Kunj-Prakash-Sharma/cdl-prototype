// PRIVATE to modules/catalog: database access only. Rules live in rules.ts / lessons.ts / playback.ts. The few
// multi-step writes that must be atomic (create, move, promote a video) are here as single transactions.
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { lessonProgress, lessons, videos } from "./schema";
import { reorder } from "./rules";

export type LessonRow = typeof lessons.$inferSelect;
export type VideoRow = typeof videos.$inferSelect;
type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Serialises writers for one course, so two admins cannot give two lessons the same position. */
const lockCourse = (tx: Tx, courseSlug: string) =>
  tx.execute(sql`select pg_advisory_xact_lock(hashtext(${courseSlug}))`);

export async function getLesson(lessonId: string): Promise<LessonRow | undefined> {
  const [row] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  return row;
}

export async function getVideo(videoId: string): Promise<VideoRow | undefined> {
  const [row] = await db.select().from(videos).where(eq(videos.id, videoId));
  return row;
}

/** The lesson's current (live) video, if it has one. */
export async function getCurrentVideo(lesson: Pick<LessonRow, "currentVideoId">): Promise<VideoRow | undefined> {
  return lesson.currentVideoId ? getVideo(lesson.currentVideoId) : undefined;
}

export async function listLessonRows(courseSlug: string, includeDraft: boolean): Promise<LessonRow[]> {
  return db
    .select()
    .from(lessons)
    .where(and(eq(lessons.courseSlug, courseSlug), includeDraft ? undefined : sql`${lessons.publishedAt} is not null`))
    .orderBy(asc(lessons.position), asc(lessons.id));
}

/** Every video of these lessons, newest first (to show the state of an upload that is not live yet). */
export async function listVideosForLessons(lessonIds: string[]): Promise<VideoRow[]> {
  if (lessonIds.length === 0) return [];
  return db.select().from(videos).where(inArray(videos.lessonId, lessonIds)).orderBy(desc(videos.createdAt));
}

/** Adds a draft lesson at the end of the course. */
export async function insertLessonAtEnd(courseSlug: string, title: string): Promise<string> {
  return db.transaction(async (tx) => {
    await lockCourse(tx, courseSlug);
    const [last] = await tx
      .select({ position: lessons.position })
      .from(lessons)
      .where(eq(lessons.courseSlug, courseSlug))
      .orderBy(desc(lessons.position))
      .limit(1);
    const [row] = await tx
      .insert(lessons)
      .values({ courseSlug, title, position: (last?.position ?? 0) + 1 })
      .returning({ id: lessons.id });
    return row!.id;
  });
}

export async function updateLessonFields(
  lessonId: string,
  fields: { title?: string; isPreview?: boolean },
): Promise<boolean> {
  const updated = await db
    .update(lessons)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(lessons.id, lessonId))
    .returning({ id: lessons.id });
  return updated.length > 0;
}

/** Swaps with the neighbour, then renumbers the whole course 1..n. A move past the end changes nothing. */
export async function moveLessonInCourse(lessonId: string, direction: "up" | "down"): Promise<boolean> {
  return db.transaction(async (tx) => {
    const [lesson] = await tx.select({ courseSlug: lessons.courseSlug }).from(lessons).where(eq(lessons.id, lessonId));
    if (!lesson) return false;
    await lockCourse(tx, lesson.courseSlug);
    const rows = await tx
      .select({ id: lessons.id })
      .from(lessons)
      .where(eq(lessons.courseSlug, lesson.courseSlug))
      .orderBy(asc(lessons.position), asc(lessons.id));
    const next = reorder(
      rows.map((r) => r.id),
      lessonId,
      direction,
    );
    for (const [index, id] of next.entries()) {
      await tx
        .update(lessons)
        .set({ position: index + 1 })
        .where(and(eq(lessons.id, id), sql`${lessons.position} <> ${index + 1}`));
    }
    return true;
  });
}

/** Publishes only if the lesson has a ready current video (checked under the same statement, no gap). */
export async function publishLesson(lessonId: string, now: Date): Promise<"ok" | "not_found" | "no_video"> {
  const [lesson] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!lesson) return "not_found";
  const current = await getCurrentVideo(lesson);
  if (!current || current.state !== "ready") return "no_video";
  await db
    .update(lessons)
    .set({ publishedAt: lesson.publishedAt ?? now, updatedAt: now })
    .where(eq(lessons.id, lessonId));
  return "ok";
}

export async function unpublishLesson(lessonId: string): Promise<boolean> {
  const updated = await db
    .update(lessons)
    .set({ publishedAt: null, updatedAt: new Date() })
    .where(eq(lessons.id, lessonId))
    .returning({ id: lessons.id });
  return updated.length > 0;
}

export async function insertVideo(row: typeof videos.$inferInsert): Promise<void> {
  await db.insert(videos).values(row);
}

export async function markVideoFailed(videoId: string): Promise<void> {
  await db
    .update(videos)
    .set({ state: "failed" })
    .where(and(eq(videos.id, videoId), eq(videos.state, "uploading")));
}

export type PromoteOutcome =
  { ok: true; oldVideoId: string | null; fastStart: boolean } | { ok: false; reason: "not_found" | "not_uploading" };

/**
 * Makes a finished upload the lesson's current video. One transaction that LOCKS THE LESSON ROW first: two admins
 * finishing uploads for one lesson run one after the other, the later one wins, and the earlier one gets
 * `replaced_at` (so the purge job deletes it). A failed upload never reaches this function.
 */
export async function promoteVideo(
  videoId: string,
  ready: { sizeBytes: number; fastStart: boolean; durationSec: number },
  now: Date,
): Promise<PromoteOutcome> {
  return db.transaction(async (tx) => {
    const [found] = await tx.select({ lessonId: videos.lessonId }).from(videos).where(eq(videos.id, videoId));
    if (!found) return { ok: false, reason: "not_found" } as const;

    const [lesson] = await tx.select().from(lessons).where(eq(lessons.id, found.lessonId)).for("update");
    if (!lesson) return { ok: false, reason: "not_found" } as const;

    // Re-read under the lock: a double click on "complete" must not promote twice.
    const [video] = await tx.select().from(videos).where(eq(videos.id, videoId));
    if (!video || video.state !== "uploading") return { ok: false, reason: "not_uploading" } as const;

    await tx
      .update(videos)
      .set({
        state: "ready",
        sizeBytes: ready.sizeBytes,
        fastStart: ready.fastStart,
        durationSec: ready.durationSec,
        readyAt: now,
      })
      .where(eq(videos.id, videoId));
    const oldVideoId = lesson.currentVideoId && lesson.currentVideoId !== videoId ? lesson.currentVideoId : null;
    if (oldVideoId) await tx.update(videos).set({ replacedAt: now }).where(eq(videos.id, oldVideoId));
    await tx.update(lessons).set({ currentVideoId: videoId, updatedAt: now }).where(eq(lessons.id, lesson.id));
    return { ok: true, oldVideoId, fastStart: ready.fastStart } as const;
  });
}

export async function deleteVideo(videoId: string): Promise<void> {
  await db.delete(videos).where(eq(videos.id, videoId));
}

export async function getProgress(userId: string, lessonId: string) {
  const [row] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
  return row;
}

export async function listProgressForCourse(userId: string, courseSlug: string) {
  return db
    .select({
      lessonId: lessonProgress.lessonId,
      positionSec: lessonProgress.positionSec,
      completedAt: lessonProgress.completedAt,
    })
    .from(lessonProgress)
    .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
    .where(and(eq(lessonProgress.userId, userId), eq(lessons.courseSlug, courseSlug)));
}

/** Saves the position. Never touches `completed_at` (an earlier completion is never cleared). */
export async function upsertPosition(userId: string, lessonId: string, positionSec: number, now: Date): Promise<void> {
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId, positionSec, updatedAt: now })
    .onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: { positionSec, updatedAt: now },
    });
}

/** Sets `completed_at` only if it was empty. True means THIS call completed it (the first time). One statement, so racing saves cannot both win. */
export async function markCompletedOnce(userId: string, lessonId: string, now: Date): Promise<boolean> {
  const updated = await db
    .update(lessonProgress)
    .set({ completedAt: now })
    .where(
      and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId), isNull(lessonProgress.completedAt)),
    )
    .returning({ lessonId: lessonProgress.lessonId });
  return updated.length > 0;
}
