import { describe, expect, it } from "vitest";
import { safeNextPath } from "./next-path";

describe("safeNextPath", () => {
  it("keeps same-site relative paths with query", () => {
    expect(safeNextPath("/discover")).toBe("/discover");
    expect(safeNextPath("/learn/leadership?lesson=2")).toBe("/learn/leadership?lesson=2");
  });

  it.each([
    "https://evil.example/x",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "discover",
    "/ok\nSet-Cookie: a=b",
    "/login",
    "/login/verify",
    "",
  ])("falls back for %j", (raw) => {
    expect(safeNextPath(raw)).toBe("/my-self");
  });

  it("falls back for null and undefined, and honours a custom fallback", () => {
    expect(safeNextPath(null)).toBe("/my-self");
    expect(safeNextPath(undefined, "/discover")).toBe("/discover");
  });
});
