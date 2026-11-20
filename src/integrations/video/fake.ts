import type { VideoProvider } from "./types";

export const DEFAULT_FAKE_SAMPLE_URL = "/sample/lecture.mp4";

/**
 * Fake video adapter for dev and tests. Uploads go to our own dev endpoint (which discards the body) and playback
 * returns a real sample clip, so the whole path works without AWS.
 * `markReady` reports the size declared at `createUpload` (kept in memory), so a size mismatch is testable.
 */
export function createFakeVideo(sampleUrl: string = DEFAULT_FAKE_SAMPLE_URL): VideoProvider {
  const declaredSizes = new Map<string, number>();
  return {
    async createUpload({ videoId, sizeBytes }) {
      const providerRef = `videos/${videoId}`;
      declaredSizes.set(providerRef, sizeBytes);
      return { providerRef, uploadUrl: `/api/dev/fake-upload/${providerRef}` };
    },
    async markReady(providerRef) {
      const sizeBytes = declaredSizes.get(providerRef);
      if (sizeBytes === undefined) return { ok: false, reason: "not_found" };
      if (sizeBytes === 0) return { ok: false, reason: "empty" };
      return { ok: true, sizeBytes, fastStart: true };
    },
    async getPlayback({ expiresInSec }) {
      const expiresAt = new Date(Date.now() + expiresInSec * 1000);
      return { url: `${sampleUrl}?exp=${expiresAt.getTime()}`, expiresAt };
    },
    async remove(providerRef) {
      declaredSizes.delete(providerRef);
    },
  };
}
