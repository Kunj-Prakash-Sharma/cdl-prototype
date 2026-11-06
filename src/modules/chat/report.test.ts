import { describe, expect, it } from "vitest";
import { OCEAN_DIMENSIONS, RIASEC_DIMENSIONS } from "./question-set";
import { buildReport, reportFor } from "./report";
import { CURRENT_REPORT_COPY, REPORT_COPIES, type ReportCopy } from "./report-copy";
import type { ResultView } from "./result";
import type { OceanBand } from "./scoring";

const band = (score: number): OceanBand => (score <= 37 ? "lower" : score >= 63 ? "higher" : "middle");

/** A result with every trait at `score` unless overridden, and a clear Holland code I, A, S. */
const result = (over: Partial<Omit<ResultView, "ocean">> & { ocean?: Record<string, number> } = {}): ResultView => {
  const ocean = Object.fromEntries(
    OCEAN_DIMENSIONS.map((d) => {
      const score = over.ocean?.[d] ?? 50;
      return [d, { score, band: band(score) }];
    }),
  ) as ResultView["ocean"];
  return {
    attemptId: "attempt-1",
    setVersion: "1.0.0",
    reportVersion: CURRENT_REPORT_COPY.version,
    riasec: { R: 20, I: 90, A: 70, S: 55, E: 30, C: 40 },
    holland: { letters: ["I", "A", "S"], close: false },
    completedAt: "2026-11-05T10:00:00.000Z",
    ...over,
    ocean,
  };
};

const copy = CURRENT_REPORT_COPY;

describe("buildReport: personality cards", () => {
  it("gives every trait the card for its band, in the order O, C, E, A, N", () => {
    const view = buildReport(result({ ocean: { O: 80, C: 50, E: 20, A: 80, N: 50 } }), copy);
    expect(view.traits.map((t) => t.trait)).toEqual(["O", "C", "E", "A", "N"]);
    expect(view.traits.map((t) => t.band)).toEqual(["higher", "middle", "lower", "higher", "middle"]);
    expect(view.traits[0]).toMatchObject(copy.traits.O.cards.higher);
    expect(view.traits[1]).toMatchObject(copy.traits.C.cards.middle);
    expect(view.traits[2]).toMatchObject(copy.traits.E.cards.lower);
  });

  it("shows Neuroticism only as emotional steadiness", () => {
    const view = buildReport(result(), copy);
    expect(view.traits.find((t) => t.trait === "N")?.name).toBe("Emotional steadiness");
    expect(JSON.stringify(view).toLowerCase()).not.toContain("neurotic");
  });
});

describe('buildReport: "Try this first"', () => {
  it("is the tip of the lowest-scoring trait", () => {
    const view = buildReport(result({ ocean: { O: 60, C: 45, E: 30, A: 70, N: 55 } }), copy);
    expect(view.tryFirst).toEqual({
      label: copy.tryFirstLabel,
      trait: "E",
      name: "Extraversion",
      tip: copy.traits.E.cards.lower.tip,
    });
  });

  it("breaks a tie for the lowest by the order O, C, E, A, N", () => {
    const view = buildReport(result({ ocean: { O: 60, C: 30, E: 30, A: 30, N: 70 } }), copy);
    expect(view.tryFirst.trait).toBe("C");
  });

  it("uses the card of the lowest trait's own band, whichever band that is", () => {
    const view = buildReport(result({ ocean: { O: 80, C: 70, E: 65, A: 90, N: 64 } }), copy);
    expect(view.tryFirst.trait).toBe("N");
    expect(view.tryFirst.tip).toBe(copy.traits.N.cards.higher.tip);
  });
});

describe("buildReport: interests", () => {
  it("lists all six interest types, highest first, with the top three as areas with career families", () => {
    const view = buildReport(result(), copy);
    expect(view.interests.map((i) => i.type)).toEqual(["I", "A", "S", "C", "E", "R"]);
    expect(view.interests[0]).toMatchObject({ type: "I", name: "Investigative", score: 90 });
    expect(view.hollandLetters).toEqual(["I", "A", "S"]);
    expect(view.areas.map((a) => a.type)).toEqual(["I", "A", "S"]);
    expect(view.areas[0]!.families).toEqual([...copy.careerFamilies.I]);
    expect(view.flat).toBe(false);
    expect(view.flatNote).toBeNull();
  });

  it("orders equal scores R, I, A, S, E, C", () => {
    const riasec = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };
    const view = buildReport(result({ riasec, holland: { flat: true } }), copy);
    expect(view.interests.map((i) => i.type)).toEqual([...RIASEC_DIMENSIONS]);
  });

  it("shows the shortlist note only when the top three are close", () => {
    expect(buildReport(result(), copy).closeNote).toBeNull();
    const close = buildReport(result({ holland: { letters: ["I", "A", "S"], close: true } }), copy);
    expect(close.closeNote).toBe(copy.closeNote);
  });

  it("has no Holland code and no areas for a flat profile, and says so", () => {
    const view = buildReport(result({ holland: { flat: true } }), copy);
    expect(view.flat).toBe(true);
    expect(view.hollandLetters).toEqual([]);
    expect(view.areas).toEqual([]);
    expect(view.flatNote).toBe(copy.flatNote);
    expect(view.interests).toHaveLength(6);
  });
});

describe("buildReport: what a report must never contain", () => {
  it("has no percentile, salary, fit, aptitude, values or learner-count fields, and carries the footer", () => {
    const view = buildReport(result(), copy);
    const keys = JSON.stringify(Object.keys(view)).toLowerCase();
    for (const banned of ["percentile", "salary", "fit", "aptitude", "values", "learners"]) {
      expect(keys).not.toContain(banned);
    }
    expect(view.footer).toContain("not a diagnosis");
    expect(view.footer).toBe(copy.footer);
  });

  it("is a plain value: the same result gives the same report", () => {
    expect(buildReport(result(), copy)).toEqual(buildReport(result(), copy));
  });
});

describe("reportFor: the wording version stamped on the result", () => {
  it("reads the result with its own version, not the newest one", () => {
    const oldCopy: ReportCopy = { ...copy, version: "0.9.0-test", footer: "OLD FOOTER", draft: false };
    REPORT_COPIES_TEST_REGISTRY[oldCopy.version] = oldCopy;
    try {
      const built = reportFor(result({ reportVersion: "0.9.0-test" }));
      expect(built.ok && built.report.footer).toBe("OLD FOOTER");
      expect(built.ok && built.report.copyVersion).toBe("0.9.0-test");
      const current = reportFor(result());
      expect(current.ok && current.report.footer).toBe(copy.footer);
    } finally {
      delete REPORT_COPIES_TEST_REGISTRY[oldCopy.version];
    }
  });

  it("fails with a typed code for a version nobody knows (including prototype keys)", () => {
    expect(reportFor(result({ reportVersion: "9.9.9" }))).toEqual({ ok: false, code: "unknown_copy_version" });
    expect(reportFor(result({ reportVersion: "constructor" }))).toEqual({ ok: false, code: "unknown_copy_version" });
    expect(reportFor(result({ reportVersion: "__proto__" }))).toEqual({ ok: false, code: "unknown_copy_version" });
  });

  it("marks a report built from draft wording as draft", () => {
    const built = reportFor(result());
    expect(built.ok && built.report.draft).toBe(CURRENT_REPORT_COPY.draft);
  });
});

// The registry is `Readonly` for app code; tests add and remove an entry to prove old versions stay readable.
const REPORT_COPIES_TEST_REGISTRY = REPORT_COPIES as Record<string, ReportCopy>;
