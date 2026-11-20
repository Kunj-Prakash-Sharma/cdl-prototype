// Numbers and rate limiters for video (docs/specs/video.md). Limiters are per process (see lib/limiter.ts): enough to
// stop a script, not a billing guard.
import { createLimiter } from "@/lib/limiter";

export const MAX_VIDEO_BYTES = 2_147_483_648; // 2 GB
export const MAX_DURATION_SEC = 14_400; // 4 h
export const MAX_TITLE_LENGTH = 120;
/** How long a playback URL lives. A learner mid-watch refreshes before it ends. */
export const PLAYBACK_URL_SEC = 7_200;
/** A replaced video is deleted this long after the swap, so people mid-watch can finish. */
export const PURGE_DELAY_SEC = 86_400;
/** A position within this many seconds of the end resumes from the start. */
export const RESUME_END_MARGIN_SEC = 5;
/** Watching this share of the lesson marks it complete. */
export const COMPLETE_FRACTION = 0.9;

const HOUR = 60 * 60 * 1000;
export const anonPlaybackLimiter = createLimiter(30, HOUR); // per IP
export const userPlaybackLimiter = createLimiter(60, HOUR); // per user
export const progressLimiter = createLimiter(10, 60 * 1000); // per user
