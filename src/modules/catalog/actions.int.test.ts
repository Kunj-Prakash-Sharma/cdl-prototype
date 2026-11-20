// Integration test: who may call the video server actions. Real service + real Postgres; Better Auth's session lookup
// is a controllable stub and Next's redirect throws like the real one. Run with: npm run test:int
import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getSessionMock } = vi.hoisted(() => ({ getSessionMock: vi.fn() }));
vi.mock("@/integrations/queue", () => ({ queue: { enqueue: vi.fn(async () => {}) } }));
vi.mock("@/integrations/analytics", () => ({ analytics: { track: vi.fn() } }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": "198.51.100.7" }),
  cookies: async () => ({}),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { digest: `NEXT_REDIRECT;replace;${url};307;` });
  },
}));
vi.mock("@/modules/auth/auth", () => ({ auth: { api: { getSession: getSessionMock } } }));

import { db } from "@/lib/db";
import { hasAccess } from "@/modules/commerce/service";
import { grantCourseAccessAction, revokeCourseAccessAction } from "@/modules/commerce/actions";
import { COURSES } from "./courses";
import {
  completeVideoUploadAction,
  createLessonAction,
  getPlaybackAction,
  moveLessonAction,
  saveProgressAction,
  setPublishedAction,
  startVideoUploadAction,
  updateLessonAction,
} from "./actions";
import { lessons } from "./schema";

const COURSE = COURSES[0]!.slug;
const stamp = Date.now();
let counter = 0;

async function makeUser() {
  const id = `act-test-${stamp}-${counter++}`;
  await db.execute(sql`insert into auth_user (id, name, email) values (${id}, 'Asha', ${id + "@phone.invalid"})`);
  return id;
}
const asUser = (id: string, extra: object = {}) =>
  getSessionMock.mockResolvedValue({ user: { id, name: "Asha", role: "learner", isAnonymous: false, ...extra } });
const asNobody = () => getSessionMock.mockResolvedValue(null);

beforeEach(() => getSessionMock.mockReset());

describe("admin actions refuse non-admins", () => {
  const calls: [string, () => Promise<unknown>][] = [
    ["createLesson", () => createLessonAction({ courseSlug: COURSE, title: "x" })],
    ["updateLesson", () => updateLessonAction({ lessonId: crypto.randomUUID(), title: "x" })],
    ["moveLesson", () => moveLessonAction({ lessonId: crypto.randomUUID(), direction: "up" })],
    ["setPublished", () => setPublishedAction({ lessonId: crypto.randomUUID(), published: false })],
    ["startVideoUpload", () => startVideoUploadAction({ lessonId: crypto.randomUUID(), sizeBytes: 10 })],
    ["completeVideoUpload", () => completeVideoUploadAction({ videoId: crypto.randomUUID(), durationSec: 10 })],
    ["grantCourseAccess", () => grantCourseAccessAction({ userId: "u", courseSlug: COURSE })],
    ["revokeCourseAccess", () => revokeCourseAccessAction({ userId: "u", courseSlug: COURSE })],
  ];

  it.each(calls)("%s: logged-out caller is redirected to the admin login", async (_name, call) => {
    asNobody();
    await expect(call()).rejects.toMatchObject({ digest: expect.stringContaining("/admin/login") });
  });

  it.each(calls)("%s: a learner is redirected home", async (_name, call) => {
    asUser(await makeUser());
    await expect(call()).rejects.toMatchObject({ digest: expect.stringContaining("NEXT_REDIRECT;replace;/;") });
  });

  it("a refused createLesson makes no lesson", async () => {
    const title = `never-${stamp}`;
    asUser(await makeUser());
    await createLessonAction({ courseSlug: COURSE, title }).catch(() => {});
    expect(await db.select().from(lessons).where(eq(lessons.title, title))).toHaveLength(0);
  });
});

describe("admin actions for an admin", () => {
  it("creates a lesson and returns fixed codes for bad input", async () => {
    asUser(await makeUser(), { role: "admin" });
    const ok = await createLessonAction({ courseSlug: COURSE, title: `Admin lesson ${stamp}` });
    expect(ok).toMatchObject({ ok: true, lessonId: expect.any(String) });
    expect(await createLessonAction({ courseSlug: "nope", title: "x" })).toEqual({ ok: false, code: "invalid_input" });
    expect(await createLessonAction("garbage")).toEqual({ ok: false, code: "invalid_input" });
  });

  it("grants and revokes access, checking the course for a grant only", async () => {
    const admin = await makeUser();
    const learner = await makeUser();
    asUser(admin, { role: "admin" });
    expect(await grantCourseAccessAction({ userId: learner, courseSlug: COURSE })).toEqual({ ok: true });
    expect(await hasAccess(learner, COURSE)).toBe(true);
    expect(await grantCourseAccessAction({ userId: learner, courseSlug: "no-such-course" })).toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(await grantCourseAccessAction({ userId: "no-such-user", courseSlug: COURSE })).toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(await revokeCourseAccessAction({ userId: learner, courseSlug: COURSE })).toEqual({ ok: true });
    expect(await hasAccess(learner, COURSE)).toBe(false);
    expect(await revokeCourseAccessAction({ userId: learner, courseSlug: "removed-course" })).toEqual({ ok: true });
  });
});

describe("learner actions", () => {
  it("getPlaybackAction rejects a malformed lesson id without touching the database", async () => {
    asNobody();
    expect(await getPlaybackAction({ lessonId: "junk" })).toEqual({ ok: false, code: "not_found" });
    expect(await getPlaybackAction({ lessonId: crypto.randomUUID(), anonymousId: "not-a-uuid" })).toEqual({
      ok: false,
      code: "not_found",
    });
  });

  it("treats a guest (anonymous) session as logged out", async () => {
    // an admin makes a published paid lesson
    asUser(await makeUser(), { role: "admin" });
    const created = await createLessonAction({ courseSlug: COURSE, title: `Guest test ${stamp}` });
    if (!created.ok) throw new Error();
    const start = await startVideoUploadAction({ lessonId: created.lessonId, sizeBytes: 1000 });
    if (!start.ok) throw new Error();
    await completeVideoUploadAction({ videoId: start.videoId, durationSec: 60 });
    await setPublishedAction({ lessonId: created.lessonId, published: true });

    asUser(await makeUser(), { isAnonymous: true });
    expect(await getPlaybackAction({ lessonId: created.lessonId })).toEqual({ ok: false, code: "login_required" });
    asNobody();
    expect(await getPlaybackAction({ lessonId: created.lessonId })).toEqual({ ok: false, code: "login_required" });
  });

  it("saveProgressAction needs a real login and valid input", async () => {
    asNobody();
    expect(await saveProgressAction({ lessonId: crypto.randomUUID(), positionSec: 5 })).toEqual({
      ok: false,
      code: "login_required",
    });
    asUser(await makeUser(), { isAnonymous: true });
    expect(await saveProgressAction({ lessonId: crypto.randomUUID(), positionSec: 5 })).toEqual({
      ok: false,
      code: "login_required",
    });
    asUser(await makeUser());
    expect(await saveProgressAction({ lessonId: "junk", positionSec: 5 })).toEqual({
      ok: false,
      code: "invalid_input",
    });
    expect(await saveProgressAction({ lessonId: crypto.randomUUID(), positionSec: -1 })).toEqual({
      ok: false,
      code: "invalid_input",
    });
  });
});
