// Integration test: lessons, uploads, replace + purge, playback access and progress. Real catalog + commerce + auth
// watermark on real Postgres; the queue, analytics and Better Auth are stubbed. Run with: npm run test:int
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { enqueue, track } = vi.hoisted(() => ({ enqueue: vi.fn(async () => {}), track: vi.fn() }));
vi.mock("@/integrations/queue", () => ({ queue: { enqueue } }));
vi.mock("@/integrations/analytics", () => ({ analytics: { track } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(), cookies: async () => ({}) }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/modules/auth/auth", () => ({ auth: {} }));

import { video } from "@/integrations/video";
import { db } from "@/lib/db";
import { grantAccess } from "@/modules/commerce/service";
import { WATERMARK_ID_PATTERN } from "@/modules/auth/watermark";
import { COURSES } from "./courses";
import { purgeVideo } from "./jobs";
import { anonPlaybackLimiter } from "./limits";
import { lessonProgress, videos } from "./schema";
import {
  completeVideoUpload,
  createLesson,
  getPlayback,
  listLessons,
  listProgress,
  moveLesson,
  saveProgress,
  setPublished,
  startVideoUpload,
  updateLesson,
} from "./service";

const COURSE = COURSES[0]!.slug;
const stamp = Date.now();
let counter = 0;
const SIZE = 5_000_000;

async function makeUser() {
  const id = `video-test-${stamp}-${counter++}`;
  await db.execute(sql`insert into auth_user (id, name, email) values (${id}, 'Asha', ${id + "@phone.invalid"})`);
  return id;
}
async function makeLesson(opts: { preview?: boolean } = {}) {
  const res = await createLesson({ courseSlug: COURSE, title: `Lesson ${stamp}-${counter++}` });
  if (!res.ok) throw new Error("createLesson failed");
  if (opts.preview) await updateLesson({ lessonId: res.lessonId, isPreview: true });
  return res.lessonId;
}
async function upload(lessonId: string, durationSec = 600) {
  const start = await startVideoUpload({ lessonId, sizeBytes: SIZE });
  if (!start.ok) throw new Error("start failed");
  const done = await completeVideoUpload({ videoId: start.videoId, durationSec });
  if (!done.ok) throw new Error(`complete failed: ${done.code}`);
  return start.videoId;
}
const view = async (lessonId: string) =>
  (await listLessons(COURSE, { includeDraft: true })).find((l) => l.id === lessonId)!;
const videoRow = async (id: string) => (await db.select().from(videos).where(eq(videos.id, id)))[0];
let ip = "";

beforeEach(() => {
  enqueue.mockClear();
  track.mockClear();
  ip = `203.0.113.${counter++ % 250}-${stamp}`;
});

describe("lessons and uploads", () => {
  it("starts as a draft with no video, then uploads and completes", async () => {
    const lessonId = await makeLesson();
    expect(await view(lessonId)).toMatchObject({ published: false, videoState: "none", durationSec: null });
    const start = await startVideoUpload({ lessonId, sizeBytes: SIZE });
    expect(start.ok && start.uploadUrl).toMatch(/^\/api\/dev\/fake-upload\/videos\//);
    expect(await view(lessonId)).toMatchObject({ videoState: "uploading" });
    if (!start.ok) return;
    expect(await completeVideoUpload({ videoId: start.videoId, durationSec: 600 })).toEqual({
      ok: true,
      fastStart: true,
    });
    expect(await view(lessonId)).toMatchObject({ videoState: "ready", durationSec: 600, fastStart: true });
  });

  it("refuses bad input", async () => {
    const lessonId = await makeLesson();
    expect(await createLesson({ courseSlug: "no-such-course", title: "x" })).toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(await createLesson({ courseSlug: COURSE, title: "  " })).toEqual({ ok: false, code: "invalid_input" });
    expect(await startVideoUpload({ lessonId, sizeBytes: 0 })).toEqual({ ok: false, code: "invalid_input" });
    expect(await startVideoUpload({ lessonId, sizeBytes: 2_147_483_649 })).toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(await startVideoUpload({ lessonId: crypto.randomUUID(), sizeBytes: 10 })).toEqual({
      ok: false,
      code: "not_found",
    });
    const start = await startVideoUpload({ lessonId, sizeBytes: 10 });
    if (!start.ok) throw new Error();
    expect(await completeVideoUpload({ videoId: start.videoId, durationSec: 14_401 })).toEqual({
      ok: false,
      code: "invalid_input",
    });
  });

  it("a size mismatch fails the new video and the old one stays current", async () => {
    const lessonId = await makeLesson();
    const first = await upload(lessonId);
    const start = await startVideoUpload({ lessonId, sizeBytes: SIZE });
    if (!start.ok) throw new Error();
    await db
      .update(videos)
      .set({ declaredSizeBytes: SIZE + 1 })
      .where(eq(videos.id, start.videoId));
    expect(await completeVideoUpload({ videoId: start.videoId, durationSec: 100 })).toEqual({
      ok: false,
      code: "upload_failed",
    });
    expect((await videoRow(start.videoId))?.state).toBe("failed");
    expect((await videoRow(first))?.replacedAt).toBeNull();
    expect(await view(lessonId)).toMatchObject({ videoState: "ready", durationSec: 600 });
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("a missing file fails the video; completing twice is refused", async () => {
    const lessonId = await makeLesson();
    const start = await startVideoUpload({ lessonId, sizeBytes: SIZE });
    if (!start.ok) throw new Error();
    const row = await videoRow(start.videoId);
    await video.remove(row!.providerRef);
    expect(await completeVideoUpload({ videoId: start.videoId, durationSec: 100 })).toEqual({
      ok: false,
      code: "upload_failed",
    });
    expect(await completeVideoUpload({ videoId: start.videoId, durationSec: 100 })).toEqual({
      ok: false,
      code: "invalid_state",
    });
  });

  it("publish needs a ready video; unpublish is always allowed", async () => {
    const lessonId = await makeLesson();
    expect(await setPublished({ lessonId, published: true })).toEqual({ ok: false, code: "no_video" });
    await upload(lessonId);
    expect(await setPublished({ lessonId, published: true })).toEqual({ ok: true });
    expect((await view(lessonId)).published).toBe(true);
    expect(await setPublished({ lessonId, published: false })).toEqual({ ok: true });
    expect((await view(lessonId)).published).toBe(false);
    expect(await setPublished({ lessonId: crypto.randomUUID(), published: true })).toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("listLessons hides drafts unless asked", async () => {
    const lessonId = await makeLesson();
    expect((await listLessons(COURSE)).some((l) => l.id === lessonId)).toBe(false);
    expect((await listLessons(COURSE, { includeDraft: true })).some((l) => l.id === lessonId)).toBe(true);
  });

  it("moves lessons and keeps positions 1..n with no gaps or ties", async () => {
    const [a, b, c] = [await makeLesson(), await makeLesson(), await makeLesson()];
    expect(await moveLesson({ lessonId: c!, direction: "up" })).toEqual({ ok: true });
    const order = (await listLessons(COURSE, { includeDraft: true })).map((l) => l.id);
    expect(order.indexOf(c!)).toBeLessThan(order.indexOf(b!));
    expect(order.indexOf(b!)).toBeGreaterThan(order.indexOf(a!));
    await moveLesson({ lessonId: order[0]!, direction: "up" }); // past the top: no-op
    const positions = (await listLessons(COURSE, { includeDraft: true })).map((l) => l.position);
    expect(positions).toEqual(positions.map((_, i) => i + 1));
  });
});

describe("replace and purge", () => {
  it("marks the old video replaced, queues one delayed purge, and the purge is safe to repeat", async () => {
    const lessonId = await makeLesson();
    const oldId = await upload(lessonId);
    const newId = await upload(lessonId, 300);
    expect((await videoRow(oldId))?.replacedAt).not.toBeNull();
    expect((await videoRow(newId))?.replacedAt).toBeNull();
    expect(enqueue).toHaveBeenCalledTimes(1);
    expect(enqueue).toHaveBeenCalledWith(
      "video.purge",
      { videoId: oldId },
      { delaySec: 86_400, singletonKey: `purge:${oldId}` },
    );
    expect(await view(lessonId)).toMatchObject({ durationSec: 300 });

    const remove = vi.spyOn(video, "remove");
    await purgeVideo({ videoId: oldId });
    expect(await videoRow(oldId)).toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
    await expect(purgeVideo({ videoId: oldId })).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledTimes(1);
    remove.mockRestore();
  });

  it("never purges the live video, and drops a bad payload", async () => {
    const lessonId = await makeLesson();
    const liveId = await upload(lessonId);
    await purgeVideo({ videoId: liveId });
    expect(await videoRow(liveId)).toBeDefined();
    await expect(purgeVideo({ videoId: "nope" })).resolves.toBeUndefined();
  });

  it("two completions at once leave exactly one current video", async () => {
    const lessonId = await makeLesson();
    await upload(lessonId);
    const a = await startVideoUpload({ lessonId, sizeBytes: SIZE });
    const b = await startVideoUpload({ lessonId, sizeBytes: SIZE });
    if (!a.ok || !b.ok) throw new Error();
    const results = await Promise.all([
      completeVideoUpload({ videoId: a.videoId, durationSec: 100 }),
      completeVideoUpload({ videoId: b.videoId, durationSec: 200 }),
    ]);
    expect(results.every((r) => r.ok)).toBe(true);
    const all = await db.select().from(videos).where(eq(videos.lessonId, lessonId));
    const live = all.filter((v) => v.state === "ready" && v.replacedAt === null);
    expect(live).toHaveLength(1);
    const lessonView = await view(lessonId);
    expect(lessonView.durationSec).toBe(live[0]!.durationSec);
  });
});

describe("playback access", () => {
  async function publishedLesson(opts: { preview?: boolean } = {}) {
    const lessonId = await makeLesson(opts);
    await upload(lessonId);
    await setPublished({ lessonId, published: true });
    return lessonId;
  }

  it("lets an anonymous visitor watch a preview, with no watermark, and tracks preview_played once", async () => {
    const lessonId = await publishedLesson({ preview: true });
    const anonymousId = crypto.randomUUID();
    const res = await getPlayback({ lessonId, userId: null, ip, anonymousId });
    expect(res).toMatchObject({ ok: true, resumeSec: 0, watermarkId: null });
    expect(res.ok && res.url).toMatch(/^\/sample\/lecture\.mp4\?exp=\d+$/);
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(anonymousId, "preview_played", { courseId: COURSE });
  });

  it("ignores a bad anonymous id (no event)", async () => {
    const lessonId = await publishedLesson({ preview: true });
    await getPlayback({ lessonId, userId: null, ip, anonymousId: "not-a-uuid" });
    expect(track).not.toHaveBeenCalled();
  });

  it("returns every access code", async () => {
    const paid = await publishedLesson();
    const user = await makeUser();
    expect(await getPlayback({ lessonId: paid, userId: null, ip })).toEqual({ ok: false, code: "login_required" });
    expect(await getPlayback({ lessonId: paid, userId: user, ip })).toEqual({ ok: false, code: "not_entitled" });
    await grantAccess({ userId: user, courseSlug: COURSE, grantedBy: user });
    const ok = await getPlayback({ lessonId: paid, userId: user, ip });
    expect(ok.ok && ok.watermarkId).toMatch(WATERMARK_ID_PATTERN);

    const draft = await makeLesson();
    await upload(draft);
    expect(await getPlayback({ lessonId: draft, userId: user, ip })).toEqual({ ok: false, code: "not_found" });
    const noVideo = await makeLesson();
    await db.execute(sql`update lessons set published_at = now() where id = ${noVideo}`);
    expect(await getPlayback({ lessonId: noVideo, userId: user, ip })).toEqual({ ok: false, code: "unavailable" });
    expect(await getPlayback({ lessonId: crypto.randomUUID(), userId: user, ip })).toEqual({
      ok: false,
      code: "not_found",
    });
    expect(await getPlayback({ lessonId: "junk", userId: user, ip })).toEqual({ ok: false, code: "not_found" });
  });

  it("gives the same watermark id on every playback", async () => {
    const lessonId = await publishedLesson({ preview: true });
    const user = await makeUser();
    const a = await getPlayback({ lessonId, userId: user, ip });
    const b = await getPlayback({ lessonId, userId: user, ip });
    expect(a.ok && b.ok && a.watermarkId).toBe(a.ok && b.ok && b.watermarkId);
  });

  it("rate-limits anonymous previews per IP", async () => {
    const lessonId = await publishedLesson({ preview: true });
    anonPlaybackLimiter.hit(`ip:${ip}`, Date.now()); // 1 used
    for (let i = 0; i < 29; i++) expect((await getPlayback({ lessonId, userId: null, ip })).ok).toBe(true);
    const res = await getPlayback({ lessonId, userId: null, ip });
    expect(res).toMatchObject({ ok: false, code: "rate_limited" });
  });
});

describe("progress", () => {
  async function entitledSetup(durationSec = 100) {
    const lessonId = await makeLesson();
    await upload(lessonId, durationSec);
    await setPublished({ lessonId, published: true });
    const user = await makeUser();
    await grantAccess({ userId: user, courseSlug: COURSE, grantedBy: user });
    return { lessonId, user };
  }

  it("saves a position, resumes from it, and clamps to the video length", async () => {
    const { lessonId, user } = await entitledSetup();
    expect(await saveProgress({ userId: user, lessonId, positionSec: 40 })).toEqual({ ok: true });
    expect((await listProgress(user, COURSE)).get(lessonId)).toEqual({ positionSec: 40, completed: false });
    const play = await getPlayback({ lessonId, userId: user, ip });
    expect(play.ok && play.resumeSec).toBe(40);
    await saveProgress({ userId: user, lessonId, positionSec: 5000 });
    expect((await listProgress(user, COURSE)).get(lessonId)?.positionSec).toBe(100);
    const near = await getPlayback({ lessonId, userId: user, ip });
    expect(near.ok && near.resumeSec).toBe(0); // within 5 s of the end
  });

  it("only writes the caller's own row", async () => {
    const { lessonId, user } = await entitledSetup();
    const other = await makeUser();
    await saveProgress({ userId: user, lessonId, positionSec: 10 });
    const rows = await db.select().from(lessonProgress).where(eq(lessonProgress.lessonId, lessonId));
    expect(rows.map((r) => r.userId)).toEqual([user]);
    expect(await saveProgress({ userId: other, lessonId, positionSec: 10 })).toEqual({
      ok: false,
      code: "not_entitled",
    });
  });

  it("completes once at 90%, never un-completes, and fires lesson_completed once", async () => {
    const { lessonId, user } = await entitledSetup();
    await saveProgress({ userId: user, lessonId, positionSec: 50 });
    expect(track).not.toHaveBeenCalled();
    await saveProgress({ userId: user, lessonId, positionSec: 92 });
    await saveProgress({ userId: user, lessonId, positionSec: 95 });
    await saveProgress({ userId: user, lessonId, positionSec: 10 });
    expect((await listProgress(user, COURSE)).get(lessonId)).toEqual({ positionSec: 10, completed: true });
    expect(track).toHaveBeenCalledTimes(1);
    expect(track).toHaveBeenCalledWith(user, "lesson_completed", { courseId: COURSE, lessonId });
  });

  it("refuses progress for a lesson the learner cannot access", async () => {
    const lessonId = await makeLesson();
    await upload(lessonId);
    const user = await makeUser();
    expect(await saveProgress({ userId: user, lessonId, positionSec: 1 })).toEqual({ ok: false, code: "not_found" });
    expect(await saveProgress({ userId: user, lessonId: "junk", positionSec: 1 })).toEqual({
      ok: false,
      code: "invalid_input",
    });
  });

  it("limits saves to 10 a minute per learner", async () => {
    const { lessonId, user } = await entitledSetup();
    for (let i = 0; i < 10; i++) expect((await saveProgress({ userId: user, lessonId, positionSec: i })).ok).toBe(true);
    expect(await saveProgress({ userId: user, lessonId, positionSec: 11 })).toMatchObject({
      ok: false,
      code: "rate_limited",
    });
  });
});
