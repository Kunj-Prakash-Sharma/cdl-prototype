// Fixtures F1 to F4 are the worked examples in docs/requirements/assessment.md section 6.
import { describe, expect, it } from "vitest";
import {
  CURRENT_QUESTION_SET,
  OCEAN_DIMENSIONS,
  RIASEC_DIMENSIONS,
  type OceanDimension,
  type QuestionSet,
  type RiasecDimension,
  type Thresholds,
} from "./question-set";
import { bandFor, scoreAttempt, scoreOcean, scoreRiasec, type Answers } from "./scoring";

const set = CURRENT_QUESTION_SET;

type Pair = readonly [number, number];
/** Raw answers as a learner would tap them: item 1 then item 2 of each dimension. */
const oceanAnswers = (raw: Record<OceanDimension, Pair>): Record<string, number> =>
  Object.fromEntries(
    OCEAN_DIMENSIONS.flatMap((d) => [
      [`o-${d}-1`, raw[d][0]],
      [`o-${d}-2`, raw[d][1]],
    ]),
  );
const riasecAnswers = (raw: Record<RiasecDimension, Pair>): Record<string, number> =>
  Object.fromEntries(
    RIASEC_DIMENSIONS.flatMap((d) => [
      [`r-${d}-1`, raw[d][0]],
      [`r-${d}-2`, raw[d][1]],
    ]),
  );
const allSame = (prefix: "o" | "r", dims: readonly string[], value: number) =>
  Object.fromEntries(
    dims.flatMap((d) => [
      [`${prefix}-${d}-1`, value],
      [`${prefix}-${d}-2`, value],
    ]),
  );
const withThresholds = (t: Partial<Thresholds>): QuestionSet => ({ ...set, thresholds: { ...set.thresholds, ...t } });

// F1: tie-break and close top 3
const F1_OCEAN = oceanAnswers({ O: [5, 2], C: [4, 2], E: [2, 4], A: [5, 1], N: [3, 3] });
const F1_RIASEC = riasecAnswers({ R: [2, 1], I: [5, 4], A: [4, 4], S: [4, 5], E: [3, 3], C: [2, 3] });
const F1: Answers = { ...F1_OCEAN, ...F1_RIASEC };

// F2: clear lead
const F2_RIASEC = riasecAnswers({ R: [5, 5], I: [4, 4], A: [3, 3], S: [2, 2], E: [1, 1], C: [1, 2] });

describe("F1: tie-break and close top 3", () => {
  const result = scoreAttempt(F1, set);

  it("scores OCEAN with reverse keys: O 88, C 75, E 25, A 100, N 50", () => {
    expect(result).toMatchObject({ status: "ok" });
    if (result.status !== "ok") return;
    expect(Object.fromEntries(OCEAN_DIMENSIONS.map((d) => [d, result.ocean[d].score]))).toEqual({
      O: 88,
      C: 75,
      E: 25,
      A: 100,
      N: 50,
    });
  });

  it("maps the OCEAN scores to bands: O higher, C higher, E lower, A higher, N middle", () => {
    if (result.status !== "ok") throw new Error("expected ok");
    expect(Object.fromEntries(OCEAN_DIMENSIONS.map((d) => [d, result.ocean[d].band]))).toEqual({
      O: "higher",
      C: "higher",
      E: "lower",
      A: "higher",
      N: "middle",
    });
  });

  it("scores RIASEC: R 13, I 88, A 75, S 88, E 50, C 38", () => {
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.riasec).toEqual({ R: 13, I: 88, A: 75, S: 88, E: 50, C: 38 });
  });

  it("breaks the I/S tie in the order R, I, A, S, E, C: the code is ISA, shown as a close group", () => {
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.holland).toEqual({ letters: ["I", "S", "A"], close: true });
  });
});

describe("F2: clear lead", () => {
  it("gives R 100, I 75, A 50, S 25, E 0, C 13 and the strictly ranked code RIA", () => {
    const result = scoreRiasec(F2_RIASEC, set);
    expect(result).toEqual({
      status: "ok",
      scores: { R: 100, I: 75, A: 50, S: 25, E: 0, C: 13 },
      holland: { letters: ["R", "I", "A"], close: false },
    });
  });
});

describe("F3: flat and straight-lined RIASEC", () => {
  it("treats twelve identical answers as invalid (straight-lining), not as a flat profile", () => {
    expect(scoreRiasec(allSame("r", RIASEC_DIMENSIONS, 3), set)).toEqual({ status: "invalid", stage: "riasec" });
  });

  it("gives no code when the answers vary but every type is within 13 of the others", () => {
    // 3,3,3,4,3,3,3,3,3,3,3,3 -> five types at 50, I at 63 (3.5 rounds up): spread 13
    const raw = riasecAnswers({ R: [3, 3], I: [3, 4], A: [3, 3], S: [3, 3], E: [3, 3], C: [3, 3] });
    const result = scoreRiasec(raw, set);
    expect(result).toMatchObject({ status: "ok", holland: { flat: true } });
    if (result.status === "ok") expect(result.scores.I).toBe(63);
  });
});

describe("F4: incomplete", () => {
  it("marks RIASEC incomplete with 9 of 12 answered (below 80%)", () => {
    const nine = { ...F1_RIASEC };
    for (const id of ["r-R-2", "r-A-2", "r-S-2"]) delete nine[id]; // every dimension still has one item
    expect(scoreRiasec(nine, set)).toEqual({ status: "incomplete", stage: "riasec" });
  });

  it("accepts 10 of 12 answered (83%)", () => {
    const ten = { ...F1_RIASEC };
    for (const id of ["r-R-2", "r-S-2"]) delete ten[id];
    expect(scoreRiasec(ten, set).status).toBe("ok");
  });
});

describe("minimum answered (rule 3)", () => {
  it("needs 8 of 10 OCEAN items", () => {
    const eight = { ...F1_OCEAN };
    for (const id of ["o-O-2", "o-E-2"]) delete eight[id];
    expect(scoreOcean(eight, set).status).toBe("ok");
    delete eight["o-C-2"];
    expect(scoreOcean(eight, set)).toEqual({ status: "incomplete", stage: "ocean" });
  });

  it("needs at least one answered item in every dimension, even above 80%", () => {
    const noC = { ...F1_RIASEC };
    delete noC["r-C-1"];
    delete noC["r-C-2"]; // 10 of 12 = 83%, but C has nothing
    expect(scoreRiasec(noC, set)).toEqual({ status: "incomplete", stage: "riasec" });
  });

  it("scores a dimension from its one answered item", () => {
    const one = { ...F1_OCEAN };
    delete one["o-O-2"]; // only o-O-1 = 5 (+) -> 100
    delete one["o-N-1"]; // only o-N-2 = 3 (-) -> keyed 3 -> 50
    const result = scoreOcean(one, set);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.scores.O.score).toBe(100);
    expect(result.scores.N.score).toBe(50);
  });

  it("is incomplete when nothing is answered", () => {
    expect(scoreAttempt({}, set)).toEqual({ status: "incomplete", stage: "ocean" });
  });
});

describe("straight-lining (rule 4)", () => {
  it("flags OCEAN when all ten answers are the same", () => {
    expect(scoreOcean(allSame("o", OCEAN_DIMENSIONS, 3), set)).toEqual({ status: "invalid", stage: "ocean" });
  });

  it("is judged per stage: varied OCEAN is fine while same-answer RIASEC is invalid", () => {
    const result = scoreAttempt({ ...F1_OCEAN, ...allSame("r", RIASEC_DIMENSIONS, 4) }, set);
    expect(result).toEqual({ status: "invalid", stage: "riasec" });
  });

  it("reports OCEAN first when both stages have a problem", () => {
    const result = scoreAttempt({ ...allSame("o", OCEAN_DIMENSIONS, 2), ...allSame("r", RIASEC_DIMENSIONS, 2) }, set);
    expect(result).toEqual({ status: "invalid", stage: "ocean" });
  });

  it("checks completeness before straight-lining (too few answers is incomplete, not invalid)", () => {
    const sevenSame = Object.fromEntries(
      OCEAN_DIMENSIONS.slice(0, 3).flatMap((d) => [
        [`o-${d}-1`, 3],
        [`o-${d}-2`, 3],
      ]),
    );
    expect(scoreOcean({ ...sevenSame, "o-A-1": 3 }, set)).toEqual({ status: "incomplete", stage: "ocean" });
  });
});

describe("reverse keying (rule 1) and rounding (rule 2)", () => {
  const baseline = F1_OCEAN; // varied, so no other dimension can trigger straight-lining
  const scoreOf = (d: OceanDimension, [first, second]: Pair) => {
    const result = scoreOcean({ ...baseline, [`o-${d}-1`]: first, [`o-${d}-2`]: second }, set);
    if (result.status !== "ok") throw new Error("expected ok");
    return result.scores[d].score;
  };

  it.each(OCEAN_DIMENSIONS)("reverses only the second (-) item of %s", (d) => {
    // item 1 is "+", item 2 is "-" (6 - value)
    expect(scoreOf(d, [5, 1])).toBe(100); // 5 and 5
    expect(scoreOf(d, [1, 5])).toBe(0); //   1 and 1
    expect(scoreOf(d, [5, 5])).toBe(50); //  5 and 1
    expect(scoreOf(d, [1, 1])).toBe(50); //  1 and 5
    expect(scoreOf(d, [3, 3])).toBe(50); //  3 and 3
  });

  it("never reverses RIASEC items", () => {
    const result = scoreRiasec(
      riasecAnswers({ R: [5, 5], I: [1, 1], A: [3, 3], S: [3, 3], E: [3, 3], C: [3, 3] }),
      set,
    );
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.scores.R).toBe(100);
    expect(result.scores.I).toBe(0);
  });

  it("rounds halves up: means 1.5, 2.5, 3.5, 4.5 give 13, 38, 63, 88", () => {
    const result = scoreRiasec(
      riasecAnswers({ R: [1, 2], I: [2, 3], A: [3, 4], S: [4, 5], E: [5, 5], C: [1, 1] }),
      set,
    );
    if (result.status !== "ok") throw new Error("expected ok");
    expect([result.scores.R, result.scores.I, result.scores.A, result.scores.S]).toEqual([13, 38, 63, 88]);
  });

  it("gives the nine possible two-item scores 0, 13, 25, 38, 50, 63, 75, 88, 100", () => {
    const seen = new Set<number>();
    for (let sum = 2; sum <= 10; sum++) {
      const first = Math.min(5, sum - 1);
      const raw = riasecAnswers({ R: [first, sum - first], I: [1, 1], A: [5, 5], S: [3, 3], E: [2, 2], C: [4, 4] });
      const result = scoreRiasec(raw, set);
      if (result.status === "ok") seen.add(result.scores.R);
    }
    expect([...seen].sort((a, b) => a - b)).toEqual([0, 13, 25, 38, 50, 63, 75, 88, 100]);
  });
});

describe("OCEAN bands (rule 5)", () => {
  const t = set.thresholds;
  it("treats 37 as lower and 38 as middle", () => {
    expect(bandFor(37, t)).toBe("lower");
    expect(bandFor(38, t)).toBe("middle");
  });
  it("treats 62 as middle and 63 as higher", () => {
    expect(bandFor(62, t)).toBe("middle");
    expect(bandFor(63, t)).toBe("higher");
  });
  it("covers the ends of the scale", () => {
    expect(bandFor(0, t)).toBe("lower");
    expect(bandFor(100, t)).toBe("higher");
  });
  it("reads the edges from config, not from the code", () => {
    expect(bandFor(40, { oceanLow: 40, oceanHigh: 70 })).toBe("lower");
    expect(bandFor(69, { oceanLow: 40, oceanHigh: 70 })).toBe("middle");
  });
});

describe("close top 3 and flat (rules 7 and 8), spread edge 13 versus 14", () => {
  const f1 = (closeSpread: number) => scoreRiasec(F1_RIASEC, withThresholds({ closeSpread }));
  const flatButVaried = riasecAnswers({ R: [3, 3], I: [3, 4], A: [3, 3], S: [3, 3], E: [3, 3], C: [3, 3] });

  it("is close when the top-3 spread (88 - 75 = 13) is at the limit, and not when the limit is 12", () => {
    expect(f1(13)).toMatchObject({ holland: { close: true } });
    expect(f1(14)).toMatchObject({ holland: { close: true } });
    expect(f1(12)).toMatchObject({ holland: { letters: ["I", "S", "A"], close: false } });
  });

  it("is flat when the whole spread (63 - 50 = 13) is at the limit, and not when the limit is 12", () => {
    expect(scoreRiasec(flatButVaried, withThresholds({ closeSpread: 13 }))).toMatchObject({ holland: { flat: true } });
    expect(scoreRiasec(flatButVaried, withThresholds({ closeSpread: 14 }))).toMatchObject({ holland: { flat: true } });
    expect(scoreRiasec(flatButVaried, withThresholds({ closeSpread: 12 }))).toMatchObject({
      holland: { letters: ["I", "R", "A"], close: false },
    });
  });

  it("ranks ties in the fixed order R, I, A, S, E, C", () => {
    // R, A, E all tie at 75 with I at 100 and the rest low: I first, then R, A in tie order
    const raw = riasecAnswers({ R: [4, 4], I: [5, 5], A: [4, 4], S: [1, 1], E: [4, 4], C: [2, 2] });
    expect(scoreRiasec(raw, set)).toMatchObject({ holland: { letters: ["I", "R", "A"] } });
  });
});

describe("the input", () => {
  it("ignores basics, unknown keys and items of other sets", () => {
    const noisy = { ...F1, "b-age": 2, "b-status": 4, zzz: 5, "o-X-1": 1, "r-X-9": 5 };
    expect(scoreAttempt(noisy, set)).toEqual(scoreAttempt(F1, set));
  });

  it("treats values outside 1 to 5 (0, 6, 2.5, NaN, Infinity) as not answered", () => {
    const base = scoreRiasec(F1_RIASEC, set);
    if (base.status !== "ok") throw new Error("expected ok");
    for (const bad of [0, 6, 2.5, Number.NaN, Number.POSITIVE_INFINITY, -3]) {
      const result = scoreRiasec({ ...F1_RIASEC, "r-S-2": bad }, set);
      if (result.status !== "ok") throw new Error(`expected ok for ${bad}`);
      expect(result.scores.S, `value ${bad}`).toBe(75); // only r-S-1 = 4 counted
    }
  });

  it("is pure: same answers give the same result, and the input is not touched", () => {
    const frozen = Object.freeze({ ...F1 });
    const first = scoreAttempt(frozen, set);
    expect(scoreAttempt(frozen, set)).toEqual(first);
    expect(frozen).toEqual(F1);
  });

  it("has no hidden input: no clock, no randomness (a hundred runs agree)", () => {
    const first = JSON.stringify(scoreAttempt(F1, set));
    for (let i = 0; i < 100; i++) expect(JSON.stringify(scoreAttempt(F1, set))).toBe(first);
  });

  it("does not look at which wording was shown (the answer map carries no variant)", () => {
    // Variants of an item are different texts with one key; scoring only ever receives IDs and values.
    for (const item of set.items)
      expect(Object.keys(item).sort()).toEqual(["dimension", "id", "key", "stage", "variants"]);
  });
});

describe("scoreAttempt", () => {
  it("returns every score and the holland result when both stages are fine", () => {
    expect(scoreAttempt({ ...F1_OCEAN, ...F2_RIASEC }, set)).toMatchObject({
      status: "ok",
      holland: { letters: ["R", "I", "A"], close: false },
      riasec: { R: 100, I: 75, A: 50, S: 25, E: 0, C: 13 },
    });
  });

  it("uses the thresholds of the set it is given", () => {
    const strict = withThresholds({ oceanLow: 80, oceanHigh: 90 });
    const result = scoreAttempt(F1, strict);
    if (result.status !== "ok") throw new Error("expected ok");
    expect(result.ocean.C.band).toBe("lower"); // 75 <= 80
    expect(result.ocean.A.band).toBe("higher"); // 100 >= 90
  });
});
