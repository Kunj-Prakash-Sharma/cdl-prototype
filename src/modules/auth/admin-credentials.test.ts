import { describe, expect, it } from "vitest";
import { generatePassword, normalizeAdminEmail } from "./admin-credentials";

describe("normalizeAdminEmail", () => {
  it("trims and lower-cases a real address", () => {
    expect(normalizeAdminEmail("  Team@Client.COM ")).toBe("team@client.com");
  });

  it.each(["", "not-an-email", "a@b", "@client.com", "team@client..com", `${"a".repeat(250)}@client.com`])(
    "refuses %j",
    (raw) => {
      expect(normalizeAdminEmail(raw)).toBeNull();
    },
  );

  it("refuses the placeholder address that phone accounts use, so an email admin can never collide with one", () => {
    expect(normalizeAdminEmail("919876543210@phone.invalid")).toBeNull();
    expect(normalizeAdminEmail("x@PHONE.INVALID")).toBeNull();
  });
});

describe("generatePassword", () => {
  it("is 24 URL-safe characters", () => {
    expect(generatePassword()).toMatch(/^[A-Za-z0-9_-]{24}$/);
  });

  it("is different every time", () => {
    const seen = new Set(Array.from({ length: 200 }, generatePassword));
    expect(seen.size).toBe(200);
  });
});
