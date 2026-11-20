/** Where a video is in its life. No `encoding` state: we play the client's MP4 as uploaded (D91). */
export type VideoState = "uploading" | "ready" | "failed";

export type MarkReadyResult =
  { ok: true; sizeBytes: number; fastStart: boolean } | { ok: false; reason: "not_found" | "empty" };

export interface VideoProvider {
  /**
   * Returns a direct-to-storage upload URL. `providerRef` is opaque: store it as
   * `provider_ref`, never build or parse it outside the adapter.
   * `sizeBytes` and `contentType` are signed into the URL, so the upload cannot differ from what the service validated.
   */
  createUpload(input: {
    videoId: string;
    contentType: "video/mp4";
    sizeBytes: number;
  }): Promise<{ providerRef: string; uploadUrl: string }>;
  /** Checks the uploaded file exists, its size, and whether the MP4 is fast-start (`moov` before `mdat`). Duration comes from the browser, not here. */
  markReady(providerRef: string): Promise<MarkReadyResult>;
  /** Signed, expiring URL for the MP4. The caller checks entitlements first. */
  getPlayback(input: { providerRef: string; expiresInSec: number }): Promise<{ url: string; expiresAt: Date }>;
  /** Deletes the stored file. Idempotent: no error if it is already gone. */
  remove(providerRef: string): Promise<void>;
}
