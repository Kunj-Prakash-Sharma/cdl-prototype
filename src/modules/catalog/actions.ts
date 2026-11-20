"use server";

// Server actions for video lessons (docs/specs/video.md). Thin: zod (in the service) -> session / requireAdmin -> service
// -> typed `{ ok, code }`. Expected failures never throw. The learner is always the session user, never an id from the
// browser. Admin actions call requireAdmin() first: it redirects a logged-out visitor to the admin login and a
// non-admin home, so the service is never reached.
import { headers } from "next/headers";
import { guardAction } from "@/lib/guard-action";
import { getSession, requireAdmin } from "@/modules/auth/service";
import * as catalog from "./service";
import * as s from "./schemas";
import type { CatalogResult, PlaybackResult } from "./types";

const unexpected = { ok: false, code: "unavailable" } as const; // fixed fallback code for an unexpected failure

async function adminAction<T extends object>(name: string, run: () => Promise<CatalogResult<T>>) {
  return guardAction<CatalogResult<T>>(
    name,
    async () => {
      await requireAdmin();
      return run();
    },
    unexpected,
  );
}

export const createLessonAction = async (input: unknown) =>
  adminAction("createLesson", () => catalog.createLesson(input));
export const updateLessonAction = async (input: unknown) =>
  adminAction("updateLesson", () => catalog.updateLesson(input));
export const moveLessonAction = async (input: unknown) => adminAction("moveLesson", () => catalog.moveLesson(input));
export const setPublishedAction = async (input: unknown) =>
  adminAction("setPublished", () => catalog.setPublished(input));
export const startVideoUploadAction = async (input: unknown) =>
  adminAction("startVideoUpload", () => catalog.startVideoUpload(input));
export const completeVideoUploadAction = async (input: unknown) =>
  adminAction("completeVideoUpload", () => catalog.completeVideoUpload(input));

/**
 * A signed playback URL for a lesson. A visitor who is not logged in (a guest counts as logged out) can still get a
 * preview lesson. `anonymousId` is a random UUID the browser keeps for the preview_played event.
 */
export async function getPlaybackAction(input: unknown): Promise<PlaybackResult> {
  const parsed = s.getPlaybackInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "not_found" };
  return guardAction<PlaybackResult>(
    "getPlayback",
    async () => {
      const session = await getSession();
      const ip = (await headers()).get("x-forwarded-for") ?? "127.0.0.1";
      return catalog.getPlayback({
        lessonId: parsed.data.lessonId,
        userId: session?.userId ?? null,
        ip,
        anonymousId: parsed.data.anonymousId,
      });
    },
    { ok: false, code: "unavailable" },
  );
}

/** Saves the learner's position. Needs a login: anonymous previews never call this. */
export async function saveProgressAction(input: unknown): Promise<CatalogResult> {
  const parsed = s.saveProgressInput.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  return guardAction<CatalogResult>(
    "saveProgress",
    async () => {
      const session = await getSession();
      if (!session) return { ok: false, code: "login_required" };
      return catalog.saveProgress({ userId: session.userId, ...parsed.data });
    },
    unexpected,
  );
}
