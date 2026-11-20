import { describe, expect, it } from "vitest";
import { personaIdFor } from "./persona";
import { RIASEC_DIMENSIONS } from "./question-set";
import type { Holland } from "./scoring";

describe("personaIdFor: the top Holland letter picks the persona (D81)", () => {
  it("gives each type its own persona when it is the top letter", () => {
    for (const type of RIASEC_DIMENSIONS) {
      const holland: Holland = {
        letters: [type, "I", "A"].filter((l, i, all) => all.indexOf(l) === i) as never,
        close: false,
      };
      expect(personaIdFor(holland)).toBe(type);
    }
  });

  it("uses only the top letter, not the second or third", () => {
    expect(personaIdFor({ letters: ["I", "A", "S"], close: false })).toBe("I");
    expect(personaIdFor({ letters: ["A", "I", "S"], close: false })).toBe("A");
  });

  it("follows the order the scoring already gave a tie, and ignores the close flag", () => {
    expect(personaIdFor({ letters: ["R", "I", "A"], close: true })).toBe("R");
    expect(personaIdFor({ letters: ["R", "I", "A"], close: false })).toBe("R");
  });

  it("gives the generic Explorer persona to a flat profile, and to an empty code", () => {
    expect(personaIdFor({ flat: true })).toBe("explorer");
    expect(personaIdFor({ letters: [], close: false })).toBe("explorer");
  });
});
