import { describe, expect, it } from "vitest";
import { CURRENT_QUESTION_SET } from "./question-set";
import { fnv1a, pickVariant, variantFor } from "./variants";

describe("fnv1a", () => {
  // Published 32-bit FNV-1a test vectors (http://www.isthe.com/chongo/src/fnv/test_fnv.c)
  it.each([
    ["", 0x811c9dc5],
    ["a", 0xe40c292c],
    ["foobar", 0xbf9cf968],
  ])("hashes %j to the published value", (text, expected) => {
    expect(fnv1a(text)).toBe(expected);
  });

  it("hashes UTF-8 bytes, so non-ASCII text is stable", () => {
    expect(fnv1a("é")).toBe(fnv1a("é"));
    expect(fnv1a("é")).not.toBe(fnv1a("e"));
  });
});

describe("pickVariant", () => {
  it("is deterministic for the same session and item", () => {
    for (const count of [2, 3]) {
      const first = pickVariant("session-1", "o-E-1", count);
      for (let i = 0; i < 20; i++) expect(pickVariant("session-1", "o-E-1", count)).toBe(first);
    }
  });

  it("always returns a valid index", () => {
    for (let s = 0; s < 500; s++) {
      for (const count of [1, 2, 3]) {
        const index = pickVariant(`session-${s}`, "r-S-2", count);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(count);
      }
    }
  });

  it("reaches every index over many sessions, and is roughly balanced", () => {
    for (const count of [2, 3]) {
      const seen = new Array<number>(count).fill(0);
      for (let s = 0; s < 3000; s++)
        seen[pickVariant(`00000000-0000-4000-8000-${String(s).padStart(12, "0")}`, "o-C-2", count)]!++;
      for (const n of seen) expect(n, `count ${count}: ${seen}`).toBeGreaterThan(3000 / count / 2);
    }
  });

  it("does not give one learner the same index for every item", () => {
    const picks = new Set(CURRENT_QUESTION_SET.items.map((item) => pickVariant("one-learner", item.id, 2)));
    expect(picks.size).toBe(2);
  });

  it("separates session and item (no ambiguity between ab+c and a+bc)", () => {
    expect(fnv1a("ab\u0000c")).not.toBe(fnv1a("a\u0000bc"));
  });

  it("rejects a bad count", () => {
    for (const count of [0, -1, 1.5, Number.NaN]) expect(() => pickVariant("s", "i", count)).toThrow(RangeError);
  });
});

describe("variantFor", () => {
  it("returns one of the item's own variants, the same one every time", () => {
    for (const item of CURRENT_QUESTION_SET.items) {
      const variant = variantFor("session-9", item);
      expect(item.variants).toContain(variant);
      expect(variantFor("session-9", item)).toBe(variant);
    }
  });

  it("keeps the item's polarity whichever variant is shown (the key lives on the item, not the variant)", () => {
    for (const item of CURRENT_QUESTION_SET.items) {
      for (const variant of item.variants) expect(Object.keys(variant).sort()).toEqual(["id", "text"]);
    }
  });
});
