import { describe, expect, it } from "vitest";
import { BLOCKED_NAME_TERMS } from "./name-blocklist";
import { MAX_NAME_LENGTH, validateName } from "./name-check";

const ok = (value: string) => ({ ok: true, value });
const format = { ok: false, reason: "format" };
const blocked = { ok: false, reason: "blocked" };

describe("validateName: good names", () => {
  it.each([
    ["Asha", "Asha"],
    ["Asha Rao", "Asha Rao"],
    ["O'Brien", "O'Brien"],
    ["D’Souza", "D’Souza"], // curly apostrophe
    ["Anne-Marie", "Anne-Marie"],
    ["José", "José"],
    ["Zoë", "Zoë"],
    ["Björk", "Björk"],
    ["आर्यन", "आर्यन"], // Devanagari: letters plus vowel signs
    ["தமிழ்", "தமிழ்"],
    ["李雷", "李雷"],
    ["A", "A"],
  ])("accepts %j", (input, value) => {
    expect(validateName(input)).toEqual(ok(value));
  });

  it("trims and collapses spaces", () => {
    expect(validateName("  Asha   Rao  ")).toEqual(ok("Asha Rao"));
    expect(validateName("\tAsha\n Rao ")).toEqual(ok("Asha Rao"));
  });

  it("composes accents (NFC) so the stored name is canonical", () => {
    expect(validateName("José")).toEqual(ok("José"));
  });

  it("allows exactly 30 characters, not 31", () => {
    expect(validateName("a".repeat(MAX_NAME_LENGTH))).toEqual(ok("a".repeat(30)));
    expect(validateName("a".repeat(MAX_NAME_LENGTH + 1))).toEqual(format);
  });

  it("counts length the way auth does (JS string length), so chat is never looser than auth", () => {
    expect(validateName("\u{10300}".repeat(15)).ok).toBe(true); // 15 letters, 30 UTF-16 units
    expect(validateName("\u{10300}".repeat(16))).toEqual(format); // 32 units: auth would refuse it
  });
});

describe("validateName: bad format", () => {
  it.each([
    "",
    "   ",
    "\n",
    "a1",
    "123",
    "Asha!",
    "Asha_Rao",
    "Asha@home",
    "Asha.",
    "-Asha",
    "'Asha",
    " - ",
    "😀",
    "Asha 😀",
    "Asha\u0000",
    "Asha​rao", // zero-width space
    "<b>Asha</b>",
    "Asha; drop table",
  ])("rejects %j as a format problem", (input) => {
    expect(validateName(input)).toEqual(format);
  });

  it("rejects a non-string defensively", () => {
    expect(validateName(undefined as unknown as string)).toEqual(format);
    expect(validateName(42 as unknown as string)).toEqual(format);
  });
});

describe("validateName: blocked words", () => {
  it.each([
    "suicide",
    "Suicide",
    "SUICIDE.",
    "suicidal",
    "kill myself",
    "I want to die",
    "i  WANT   to   die!!",
    "I want to die tonight, please help me", // over 30 characters: still the helpline, not "too long"
    "Sûicide", // accent
    "k i l l  m y s e l f", // spread out
    "end my life",
    "idiot",
    "You are an Idiot",
    "FUCK",
  ])("blocks %j", (input) => {
    expect(validateName(input)).toEqual(blocked);
  });

  it("does not block harmless names that only contain a blocked term as part of a word", () => {
    // whole-word matching: "Diego" contains "die" and "Shitij" starts with "shit", but neither is a blocked word
    for (const name of ["Diego", "Dieter", "Ida", "Cassidy", "Shitij"]) {
      expect(validateName(name).ok, name).toBe(true);
    }
  });

  it("blocks a term whose letters are separated by dots", () => {
    expect(validateName("s.u.i.c.i.d.e")).toEqual(blocked);
  });

  it("uses the list it is given (the client's list replaces the placeholder)", () => {
    expect(validateName("Rohan", ["rohan"])).toEqual(blocked);
    expect(validateName("suicide", ["something else"])).toEqual(ok("suicide"));
    expect(validateName("Rohan", [])).toEqual(ok("Rohan"));
  });

  it("ignores empty or symbol-only terms in the list", () => {
    expect(validateName("Asha", ["", "   ", "!!!"])).toEqual(ok("Asha"));
  });

  it("checks blocked words before format, so punctuation cannot hide a distress phrase", () => {
    expect(validateName("kill myself!!!")).toEqual(blocked);
    expect(validateName("kill-myself")).toEqual(blocked);
  });
});

describe("placeholder blocklist", () => {
  it("is non-empty, lowercase, and has no duplicates", () => {
    expect(BLOCKED_NAME_TERMS.length).toBeGreaterThan(0);
    expect(new Set(BLOCKED_NAME_TERMS).size).toBe(BLOCKED_NAME_TERMS.length);
    for (const term of BLOCKED_NAME_TERMS) expect(term).toBe(term.toLowerCase());
  });
});

describe("validateName is pure", () => {
  it("gives the same answer every time", () => {
    for (const input of ["Asha", "suicide", "a1", "  Asha  "]) {
      expect(validateName(input)).toEqual(validateName(input));
    }
  });
});
