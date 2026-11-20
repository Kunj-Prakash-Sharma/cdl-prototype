import { describe, expect, it } from "vitest";
import { SAMPLE_REPORT } from "./sample-report";

describe("the fixed sample report behind the gate (D78)", () => {
  it("carries a persona, so the blurred page has the same layout as the real report", () => {
    expect(SAMPLE_REPORT.persona.id).toBe("I");
    expect(SAMPLE_REPORT.persona.strengths.length).toBeGreaterThan(0);
  });
});
