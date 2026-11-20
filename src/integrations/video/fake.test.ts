import { describe, expect, it } from "vitest";
import { createFakeVideo } from "./fake";

describe("fake video adapter", () => {
  it("createUpload gives a dev upload URL and a providerRef", async () => {
    const fake = createFakeVideo();
    const up = await fake.createUpload({ videoId: "abc", contentType: "video/mp4", sizeBytes: 500 });
    expect(up.providerRef).toBe("videos/abc");
    expect(up.uploadUrl).toBe("/api/dev/fake-upload/videos/abc");
  });

  it("markReady returns the size declared at createUpload", async () => {
    const fake = createFakeVideo();
    const { providerRef } = await fake.createUpload({ videoId: "a", contentType: "video/mp4", sizeBytes: 1234 });
    expect(await fake.markReady(providerRef)).toEqual({ ok: true, sizeBytes: 1234, fastStart: true });
  });

  it("markReady says not_found for an unknown ref (the size-mismatch / missing-file path)", async () => {
    const fake = createFakeVideo();
    expect(await fake.markReady("videos/nope")).toEqual({ ok: false, reason: "not_found" });
  });

  it("remove is idempotent and makes markReady not_found", async () => {
    const fake = createFakeVideo();
    const { providerRef } = await fake.createUpload({ videoId: "a", contentType: "video/mp4", sizeBytes: 10 });
    await fake.remove(providerRef);
    await expect(fake.remove(providerRef)).resolves.toBeUndefined();
    expect(await fake.markReady(providerRef)).toEqual({ ok: false, reason: "not_found" });
  });

  it("getPlayback returns the sample URL with an expiry", async () => {
    const fake = createFakeVideo("/sample/x.mp4");
    const before = Date.now();
    const { url, expiresAt } = await fake.getPlayback({ providerRef: "videos/a", expiresInSec: 7200 });
    expect(url).toBe(`/sample/x.mp4?exp=${expiresAt.getTime()}`);
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7200 * 1000);
  });

  it("uses the default sample clip", async () => {
    const { url } = await createFakeVideo().getPlayback({ providerRef: "videos/a", expiresInSec: 60 });
    expect(url.startsWith("/sample/lecture.mp4?exp=")).toBe(true);
  });
});
