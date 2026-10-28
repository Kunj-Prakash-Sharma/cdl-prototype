import { describe, expect, it } from "vitest";
import { maskPhone, normalizePhone, parsePhoneList } from "./phone";

describe("normalizePhone", () => {
  it.each([
    ["9876543210", "+919876543210"],
    ["+91 98765 43210", "+919876543210"],
    ["+91-98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["0091 9876543210", "+919876543210"],
    ["  (98765) 43210 ", "+919876543210"],
  ])("accepts %s", (raw, expected) => {
    expect(normalizePhone(raw)).toBe(expected);
  });

  it.each([
    "",
    "12345",
    "5876543210", // Indian mobiles start 6-9
    "+14155552671", // not +91
    "+9198765432100", // too long
    "98765abcde",
    "98765 4321",
  ])("rejects %s", (raw) => {
    expect(normalizePhone(raw)).toBeNull();
  });

  it("does not mistake a 10-digit number starting with 91 for a prefix", () => {
    expect(normalizePhone("9123456789")).toBe("+919123456789");
  });
});

describe("maskPhone", () => {
  it("keeps the country code and last 4 digits", () => {
    expect(maskPhone("+919876543210")).toBe("+91******3210");
  });
});

describe("parsePhoneList", () => {
  it("normalises, de-duplicates and drops bad entries", () => {
    const set = parsePhoneList("9876543210, +91 98765 43210, nope, 8000000000");
    expect([...set].sort()).toEqual(["+918000000000", "+919876543210"]);
  });
  it("handles undefined", () => {
    expect(parsePhoneList(undefined).size).toBe(0);
  });
});
