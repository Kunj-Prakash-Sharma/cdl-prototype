import { describe, expect, it } from "vitest";
import { clampPosition, decideAccess, isCompleted, reorder, resumePosition } from "./rules";

const base = { published: true, hasReadyVideo: true, isPreview: false, loggedIn: true, entitled: true };

describe("decideAccess", () => {
  it("lets anyone watch a preview", () => {
    expect(decideAccess({ ...base, isPreview: true, loggedIn: false, entitled: false })).toEqual({ ok: true });
  });
  it("asks a guest/anonymous visitor to log in for a paid lesson", () => {
    expect(decideAccess({ ...base, loggedIn: false, entitled: false })).toEqual({ ok: false, code: "login_required" });
  });
  it("refuses a logged-in learner without an entitlement", () => {
    expect(decideAccess({ ...base, entitled: false })).toEqual({ ok: false, code: "not_entitled" });
  });
  it("lets an entitled learner in", () => {
    expect(decideAccess(base)).toEqual({ ok: true });
  });
  it("hides an unpublished lesson, even a preview, even from an entitled learner", () => {
    expect(decideAccess({ ...base, published: false })).toEqual({ ok: false, code: "not_found" });
    expect(decideAccess({ ...base, published: false, isPreview: true })).toEqual({ ok: false, code: "not_found" });
  });
  it("says unavailable when there is no ready video", () => {
    expect(decideAccess({ ...base, hasReadyVideo: false })).toEqual({ ok: false, code: "unavailable" });
  });
  it("checks 'not found' before asking to log in", () => {
    expect(decideAccess({ ...base, published: false, loggedIn: false, entitled: false })).toEqual({
      ok: false,
      code: "not_found",
    });
  });
});

describe("resumePosition", () => {
  it("is 0 with nothing saved", () => {
    expect(resumePosition(undefined, 600)).toBe(0);
    expect(resumePosition(0, 600)).toBe(0);
  });
  it("resumes at the saved position", () => {
    expect(resumePosition(120, 600)).toBe(120);
    expect(resumePosition(594, 600)).toBe(594);
  });
  it("is 0 within 5 seconds of the end", () => {
    expect(resumePosition(595, 600)).toBe(0);
    expect(resumePosition(600, 600)).toBe(0);
  });
  it("is 0 when the saved position is beyond a shorter replacement video", () => {
    expect(resumePosition(900, 300)).toBe(0);
  });
});

describe("clampPosition and isCompleted", () => {
  it("clamps into [0, duration] and drops fractions", () => {
    expect(clampPosition(-5, 100)).toBe(0);
    expect(clampPosition(250, 100)).toBe(100);
    expect(clampPosition(42.9, 100)).toBe(42);
  });
  it("completes at 90% and not before", () => {
    expect(isCompleted(89, 100)).toBe(false);
    expect(isCompleted(90, 100)).toBe(true);
    expect(isCompleted(100, 100)).toBe(true);
  });
});

describe("reorder", () => {
  const ids = ["a", "b", "c"];
  it("moves up and down", () => {
    expect(reorder(ids, "b", "up")).toEqual(["b", "a", "c"]);
    expect(reorder(ids, "b", "down")).toEqual(["a", "c", "b"]);
  });
  it("is a no-op past the ends and for unknown ids", () => {
    expect(reorder(ids, "a", "up")).toEqual(ids);
    expect(reorder(ids, "c", "down")).toEqual(ids);
    expect(reorder(ids, "zzz", "up")).toEqual(ids);
  });
  it("does not change the input array", () => {
    reorder(ids, "b", "up");
    expect(ids).toEqual(["a", "b", "c"]);
  });
});
