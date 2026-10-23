import type { VideoProvider } from "./types";

export const fakeVideo: VideoProvider = {
  async createUpload({ videoId }) {
    const key = `videos/${videoId}`;
    return { key, uploadUrl: `fake://upload/${key}` };
  },
  onEncodeEvent(payload) {
    const p = payload as { key?: string; state?: "ready" | "failed" } | null;
    return p?.key && p.state ? { key: p.key, state: p.state } : null;
  },
  async getPlayback({ key, expiresInSec }) {
    const expiresAt = new Date(Date.now() + expiresInSec * 1000);
    return { manifestUrl: `fake://play/${key}?exp=${expiresAt.getTime()}`, expiresAt };
  },
  async getStatus() {
    return { state: "ready", durationSec: 600 };
  },
};
