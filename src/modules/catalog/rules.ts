// Pure rules for lessons, access and progress. No database, no clock: easy to test (docs/specs/video.md).
import { COMPLETE_FRACTION, RESUME_END_MARGIN_SEC } from "./limits";
import type { AccessFailCode } from "./types";

export type AccessInput = {
  published: boolean;
  hasReadyVideo: boolean;
  isPreview: boolean;
  loggedIn: boolean; // a guest counts as logged out (the caller passes null for guests)
  entitled: boolean; // only meaningful when loggedIn; the caller may skip the lookup for previews
};

/** The one access rule. Order matters: a hidden lesson is "not found" before anyone is asked to log in. */
export function decideAccess(input: AccessInput): { ok: true } | { ok: false; code: AccessFailCode } {
  if (!input.published) return { ok: false, code: "not_found" };
  if (!input.hasReadyVideo) return { ok: false, code: "unavailable" };
  if (input.isPreview) return { ok: true };
  if (!input.loggedIn) return { ok: false, code: "login_required" };
  if (!input.entitled) return { ok: false, code: "not_entitled" };
  return { ok: true };
}

/**
 * Where playback starts: 0 with no saved position or within 5 s of the end, else the saved position (never past the
 * end, which can happen after a replace with a shorter video).
 */
export function resumePosition(savedSec: number | undefined, durationSec: number): number {
  if (savedSec === undefined || savedSec <= 0) return 0;
  if (savedSec >= durationSec - RESUME_END_MARGIN_SEC) return 0;
  return Math.min(savedSec, durationSec);
}

export function clampPosition(positionSec: number, durationSec: number): number {
  return Math.min(Math.max(0, Math.floor(positionSec)), durationSec);
}

/** True once the learner passed 90% of the lesson. The caller never clears an earlier completion. */
export function isCompleted(positionSec: number, durationSec: number): boolean {
  return positionSec >= COMPLETE_FRACTION * durationSec;
}

/**
 * New order of lesson ids after moving `id` one step. Moving past either end changes nothing. Positions are then
 * written as 1..n by index, so there are never gaps or ties.
 */
export function reorder(ids: string[], id: string, direction: "up" | "down"): string[] {
  const from = ids.indexOf(id);
  if (from === -1) return ids;
  const to = direction === "up" ? from - 1 : from + 1;
  if (to < 0 || to >= ids.length) return ids;
  const next = [...ids];
  [next[from], next[to]] = [next[to]!, next[from]!];
  return next;
}
