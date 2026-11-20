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
    "/admin/login",
    "",
  ])("falls back for %j", (raw) => {
    expect(safeNextPath(raw)).toBe("/discover");
  });

  it("never returns the admin login page, and keeps other admin paths", () => {
    expect(safeNextPath("/admin/login", "/admin/callbacks")).toBe("/admin/callbacks");
    expect(safeNextPath("/admin/users?page=2", "/admin/callbacks")).toBe("/admin/users?page=2");
  });

  it("falls back for null and undefined, and honours a custom fallback", () => {
    expect(safeNextPath(null)).toBe("/discover");
    expect(safeNextPath(undefined, "/my-self")).toBe("/my-self");
  });
});
