import { describe, expect, it } from "vitest";
import { personaLead, personaSource } from "./persona-copy";

describe("persona copy", () => {
  it("never talks about a top interest type for a flat profile (it has none)", () => {
    expect(personaLead(true)).not.toMatch(/top interest|strongest interest type\./);
    expect(personaSource(true)).toMatch(/even/);
    expect(personaLead(false)).toMatch(/top interest type/);
    expect(personaSource(false)).toMatch(/strongest interest type/);
  });
});
