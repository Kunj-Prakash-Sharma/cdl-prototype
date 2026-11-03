import { describe, expect, it } from "vitest";
import {
  CURRENT_QUESTION_SET,
  OCEAN_DIMENSIONS,
  QUESTION_SETS,
  RIASEC_DIMENSIONS,
  getQuestionSet,
  type Item,
} from "./question-set";
import { QUESTION_POOL, getPoolItem } from "./question-pool";

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
    // Live IDs are pool IDs (D68): which two of a trait's pool questions are asked is the set's choice.
    expect(ocean.map((i) => i.id)).toEqual([
      "o-O-1",
      "o-O-4",
      "o-C-1",
      "o-C-5",
      "o-E-1",
      "o-E-4",
      "o-A-2",
      "o-A-4",
      "o-N-1",
      "o-N-3",
    ]);
    expect(riasec.map((i) => i.id)).toEqual([
      "r-R-1",
      "r-R-4",
      "r-I-2",
      "r-I-3",
      "r-A-1",
      "r-A-2",
      "r-S-1",
      "r-S-2",
      "r-E-1",
      "r-E-2",
      "r-C-1",
      "r-C-2",
    ]);
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

  it("gives every scored item 3 distinct, non-empty variants (the approved wording is variant 1)", () => {
    for (const item of set.items) {
      expect(item.variants.length, item.id).toBe(3);
      expect(new Set(item.variants.map((variant) => variant.text)).size, item.id).toBe(3);
      expect(item.variants[0]?.text, item.id).toBe(getPoolItem(item.id).text);
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

describe("question set 1.0.0: provenance (docs/requirements/item-sources.md)", () => {
  it("gives every item a source", () => {
    for (const item of set.items) {
      expect(item.source, item.id).toBeDefined();
      expect(["ipip", "orvis"], item.id).toContain(item.source.kind);
    }
  });

  it("maps every OCEAN item to a named IPIP marker and says how close it is", () => {
    for (const item of ocean) {
      expect(item.source.kind, item.id).toBe("ipip");
      if (item.source.kind !== "ipip") continue;
      expect(item.source.marker.trim(), item.id).not.toBe("");
      expect(["direct", "close", "loose"], item.id).toContain(item.source.match);
    }
  });

  it("maps every RIASEC item to a named ORVIS activity", () => {
    for (const item of riasec) {
      expect(item.source.kind, item.id).toBe("orvis");
      if (item.source.kind !== "orvis") continue;
      expect(item.source.activity.trim(), item.id).not.toBe("");
    }
  });

  it("takes each live item's source, key, stage and trait from the pool question with the same ID", () => {
    for (const item of set.items) {
      const pooled = getPoolItem(item.id);
      expect({ source: item.source, key: item.key, stage: item.stage, dimension: item.dimension }, item.id).toEqual({
        source: pooled.source,
        key: pooled.key,
        stage: pooled.stage,
        dimension: pooled.dimension,
      });
    }
  });
});

describe("question pool (client-approved, 2026-11-03)", () => {
  it("has 25 personality and 25 interest questions with unique IDs", () => {
    expect(QUESTION_POOL).toHaveLength(50);
    expect(new Set(QUESTION_POOL.map((q) => q.id)).size).toBe(50);
    expect(QUESTION_POOL.filter((q) => q.stage === "ocean")).toHaveLength(25);
    expect(QUESTION_POOL.filter((q) => q.stage === "riasec")).toHaveLength(25);
  });

  it("gives every OCEAN trait both an agree-keyed and a reverse-keyed question (so a live set can pick one of each)", () => {
    for (const d of OCEAN_DIMENSIONS) {
      const keys = new Set(QUESTION_POOL.filter((q) => q.stage === "ocean" && q.dimension === d).map((q) => q.key));
      expect([...keys].sort(), `ocean ${d}`).toEqual(["+", "-"]);
    }
  });

  it("has at least 2 questions for every interest type, all agree-keyed, all with an ORVIS source", () => {
    for (const d of RIASEC_DIMENSIONS) {
      const own = QUESTION_POOL.filter((q) => q.stage === "riasec" && q.dimension === d);
      expect(own.length, `riasec ${d}`).toBeGreaterThanOrEqual(2);
      expect(
        own.every((q) => q.key === "+" && q.source.kind === "orvis"),
        `riasec ${d}`,
      ).toBe(true);
    }
  });

  it("uses IPIP sources for personality and keeps IDs matching stage and trait", () => {
    for (const q of QUESTION_POOL) {
      expect(q.id, q.id).toBe(`${q.stage === "ocean" ? "o" : "r"}-${q.dimension}-${q.id.split("-")[2]}`);
      if (q.stage === "ocean") expect(q.source.kind, q.id).toBe("ipip");
    }
  });

  it("rejects an unknown pool ID", () => {
    expect(() => getPoolItem("o-X-9")).toThrow(/Unknown pool question/);
  });
});
