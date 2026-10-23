export type VideoState = "awaiting_upload" | "encoding" | "ready" | "failed";

export interface EncodeEvent {
  key: string;
  state: "ready" | "failed";
  renditions?: string[];
  durationSec?: number;
  thumbnailKey?: string;
  error?: string;
}

export interface VideoProvider {
  /** Returns a direct-to-storage upload URL. Encoding starts when the upload lands. */
  createUpload(input: { videoId: string; contentType: string }): Promise<{ key: string; uploadUrl: string }>;
  /** Maps a provider callback (e.g. MediaConvert job state) to our event; null if it is not an encode event. */
  onEncodeEvent(payload: unknown): EncodeEvent | null;
  /** Signed, expiring playback URL for the adaptive-stream manifest. The caller checks entitlements first. */
  getPlayback(input: { key: string; expiresInSec: number }): Promise<{ manifestUrl: string; expiresAt: Date }>;
  getStatus(key: string): Promise<{ state: VideoState; durationSec?: number }>;
}
