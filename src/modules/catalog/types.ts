// Safe to import from client components: types and constants only, no server code.
import type { ActionResult } from "@/lib/action-result";

/** The UI owns all wording. Codes are the contract (docs/specs/video.md). */
export type CatalogErrorCode =
  | "invalid_input"
  | "not_found"
  | "no_video" // publish needs a ready current video
  | "upload_failed" // the file is missing, empty or not the declared size
  | "invalid_state" // e.g. completing an upload that is not "uploading"
  | "login_required"
  | "not_entitled"
  | "unavailable"
  | "rate_limited";

export type CatalogResult<T extends object = object> = ActionResult<T, CatalogErrorCode>;

export type VideoStateView = "none" | "uploading" | "ready" | "failed";

export type LessonView = {
  id: string;
  courseSlug: string;
  title: string;
  position: number;
  isPreview: boolean;
  published: boolean;
  durationSec: number | null;
  videoState: VideoStateView;
  fastStart: boolean | null;
};

export type AccessFailCode = "not_found" | "login_required" | "not_entitled" | "unavailable";
export type PlaybackFailCode = AccessFailCode | "rate_limited";
export type PlaybackResult =
  | { ok: true; url: string; expiresAt: string; resumeSec: number; watermarkId: string | null }
  | { ok: false; code: PlaybackFailCode; retryAfterSec?: number };

export type ProgressView = { positionSec: number; completed: boolean };
