import { describe, expect, it } from "vitest";
import {
  CURRENT_QUESTION_SET,
  OCEAN_DIMENSIONS,
  QUESTION_SETS,
  RIASEC_DIMENSIONS,
  getQuestionSet,
  type Item,
} from "./question-set";

const set = CURRENT_QUESTION_SET;
const ocean = set.items.filter((i) => i.stage === "ocean");
const riasec = set.items.filter((i) => i.stage === "riasec");
const allVariantTexts = set.items.flatMap((i) => i.variants.map((variant) => variant.text));

describe("question set 1.0.0: shape (assessment.md sections 3 and 7)", () => {
  it("is versioned and registered under that version", () => {
    expect(set.version).toBe("1.0.0");
    expect(getQuestionSet("1.0.0")).toBe(set);
    expect(getQuestionSet("9.9.9")).toBeUndefined();
    for (const [version, registered] of Object.entries(QUESTION_SETS)) expect(registered.version).toBe(version);
  });

  it("has 4 basics (name + 3 taps), 10 OCEAN and 12 RIASEC items", () => {
    expect(1 + set.basics.length).toBe(4);
    expect(ocean).toHaveLength(10);
    expect(riasec).toHaveLength(12);
  });

  it("uses the exact fixed IDs, in order", () => {
    expect(set.name.id).toBe("b-name");
    expect(set.basics.map((b) => b.id)).toEqual(["b-age", "b-status", "b-goal"]);
    expect(ocean.map((i) => i.id)).toEqual(OCEAN_DIMENSIONS.flatMap((d) => [`o-${d}-1`, `o-${d}-2`]));
    expect(riasec.map((i) => i.id)).toEqual(RIASEC_DIMENSIONS.flatMap((d) => [`r-${d}-1`, `r-${d}-2`]));
  });

  it("has unique item IDs, and unique variant IDs of the form <item>.v<n>", () => {
    const itemIds = set.items.map((i) => i.id);
    expect(new Set(itemIds).size).toBe(itemIds.length);
    const variantIds = set.items.flatMap((i) => i.variants.map((variant) => variant.id));
    expect(new Set(variantIds).size).toBe(variantIds.length);
    for (const item of set.items) {
      item.variants.forEach((variant, index) => expect(variant.id).toBe(`${item.id}.v${index + 1}`));
    }
  });

  it("gives every scored item 2 to 3 non-empty variants", () => {
    for (const item of set.items) {
      expect(item.variants.length, item.id).toBeGreaterThanOrEqual(2);
      expect(item.variants.length, item.id).toBeLessThanOrEqual(3);
      for (const variant of item.variants) expect(variant.text.trim().length, variant.id).toBeGreaterThan(0);
    }
  });

  it("has exactly 2 items for every dimension of its own stage", () => {
    const count = (items: Item[], d: string) => items.filter((i) => i.dimension === d).length;
    for (const d of OCEAN_DIMENSIONS) expect(count(ocean, d), `ocean ${d}`).toBe(2);
    for (const d of RIASEC_DIMENSIONS) expect(count(riasec, d), `riasec ${d}`).toBe(2);
  });

  it("keys each OCEAN trait with one + and one -, and every RIASEC item +", () => {
    for (const d of OCEAN_DIMENSIONS) {
      const keys = ocean.filter((i) => i.dimension === d).map((i) => i.key);
      expect(keys.sort(), `ocean ${d}`).toEqual(["+", "-"]);
    }
    expect(riasec.every((i) => i.key === "+")).toBe(true);
  });

  it("keeps dimensions inside their stage (A means Agreeableness in OCEAN and Artistic in RIASEC)", () => {
    expect(ocean.every((i) => (OCEAN_DIMENSIONS as readonly string[]).includes(i.dimension))).toBe(true);
    expect(riasec.every((i) => (RIASEC_DIMENSIONS as readonly string[]).includes(i.dimension))).toBe(true);
  });
});

describe("question set 1.0.0: wording rules (assessment.md section 5)", () => {
  it("keeps every variant under 90 characters", () => {
    for (const text of allVariantTexts) expect(text.length, text).toBeLessThan(90);
  });

  it("uses no clinical, ranking or money words", () => {
    const forbidden =
      /\b(anxiety|anxious|depress\w*|disorder|diagnos\w*|clinical|salary|percentile|best|worst|rank\w*)\b/i;
    for (const text of allVariantTexts) expect(text, text).not.toMatch(forbidden);
  });

  it("never shows 'neuroticism'", () => {
    const everything = JSON.stringify(set);
    expect(everything).not.toMatch(/neurotic/i);
  });

  it("never hardcodes the guide's name in the data (it comes from brand config)", () => {
    expect(JSON.stringify(set)).not.toMatch(/meera/i);
  });
});

describe("question set 1.0.0: scales, thresholds, basics", () => {
  it("has 5 labels for each scale and the fixed prompts", () => {
    expect(set.scales.ocean.labels).toHaveLength(5);
    expect(set.scales.riasec.labels).toHaveLength(5);
    expect(set.scales.ocean.prompt).toBe("How much does this sound like you?");
    expect(set.scales.riasec.prompt).toBe("How much would you enjoy this?");
  });

  it("holds the thresholds from assessment.md section 6 as config", () => {
    expect(set.thresholds).toEqual({ oceanLow: 37, oceanHigh: 63, closeSpread: 13, minAnsweredPct: 80 });
  });

  it("has basics with unique, non-empty options and a reply for each", () => {
    for (const basic of set.basics) {
      expect(basic.options.length, basic.id).toBeGreaterThanOrEqual(2);
      const ids = basic.options.map((o) => o.id);
      expect(new Set(ids).size, basic.id).toBe(ids.length);
      for (const option of basic.options) {
        expect(option.label.trim(), `${basic.id}/${option.id}`).not.toBe("");
        expect(option.acknowledgement.trim(), `${basic.id}/${option.id}`).not.toBe("");
      }
    }
  });

  it("has a few Meera acknowledgement lines", () => {
    expect(set.acknowledgements.length).toBeGreaterThanOrEqual(3);
  });
});
