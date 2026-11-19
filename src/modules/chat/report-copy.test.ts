import { describe, expect, it } from "vitest";
import { OCEAN_DIMENSIONS, RIASEC_DIMENSIONS } from "./question-set";
import { CURRENT_REPORT_COPY, REPORT_COPIES, getReportCopy, type PersonaId } from "./report-copy";

const PERSONA_IDS: PersonaId[] = [...RIASEC_DIMENSIONS, "explorer"];

const BANDS = ["lower", "middle", "higher"] as const;

describe("every shipped report wording", () => {
  for (const copy of Object.values(REPORT_COPIES)) {
    describe(copy.version, () => {
      it("has a card with a title, a note and a tip for every trait in every band (15 cards)", () => {
        for (const trait of OCEAN_DIMENSIONS) {
          for (const band of BANDS) {
            const card = copy.traits[trait].cards[band];
            expect(card.title.trim(), `${trait} ${band} title`).not.toBe("");
            expect(card.note.trim(), `${trait} ${band} note`).not.toBe("");
            expect(card.tip.trim(), `${trait} ${band} tip`).not.toBe("");
          }
        }
      });

      it("names every interest type and gives 3 to 5 career families for it", () => {
        for (const type of RIASEC_DIMENSIONS) {
          expect(copy.interests[type].name.trim()).not.toBe("");
          expect(copy.careerFamilies[type].length).toBeGreaterThanOrEqual(3);
          expect(copy.careerFamilies[type].length).toBeLessThanOrEqual(5);
        }
      });

      it("has a persona for each interest type and one generic Explorer: a name, a tagline, 3 strengths and 2 growth areas", () => {
        expect(Object.keys(copy.personas).sort()).toEqual([...PERSONA_IDS].sort());
        for (const id of PERSONA_IDS) {
          const persona = copy.personas[id];
          expect(persona.name.trim(), `${id} name`).not.toBe("");
          expect(persona.tagline.trim(), `${id} tagline`).not.toBe("");
          expect(persona.strengths, `${id} strengths`).toHaveLength(3);
          expect(persona.growth, `${id} growth`).toHaveLength(2);
          for (const block of [...persona.strengths, ...persona.growth]) {
            expect(block.title.trim()).not.toBe("");
            expect(block.note.trim()).not.toBe("");
          }
        }
        expect(new Set(PERSONA_IDS.map((id) => copy.personas[id].name)).size).toBe(PERSONA_IDS.length);
      });

      it("never says neuroticism, and never puts salary, percentage or fit in the text", () => {
        const text = JSON.stringify(copy).toLowerCase();
        expect(text).not.toContain("neurotic");
        expect(text).not.toMatch(/salary|percentile|% fit|per cent|lpa/);
        expect(copy.traits.N.name).toBe("Emotional steadiness");
      });

      it("has the footer and the 'Try this first' label", () => {
        expect(copy.footer).toContain("not a diagnosis");
        expect(copy.tryFirstLabel).toBe("Try this first");
      });
    });
  }
});

describe("report wording versions", () => {
  it("finds a shipped version, and nothing for an unknown or prototype key", () => {
    expect(getReportCopy(CURRENT_REPORT_COPY.version)).toBe(CURRENT_REPORT_COPY);
    expect(getReportCopy("nope")).toBeUndefined();
    expect(getReportCopy("constructor")).toBeUndefined();
  });

  it("registers the current wording under its own version", () => {
    expect(REPORT_COPIES[CURRENT_REPORT_COPY.version]).toBe(CURRENT_REPORT_COPY);
  });

  it("is still the draft wording: this test fails on purpose once the approved text goes in (then update it)", () => {
    // Reminder for open-questions.md: copy the client-approved cards in, set draft: false, add a new version.
    expect(CURRENT_REPORT_COPY.draft).toBe(true);
    expect(CURRENT_REPORT_COPY.version).toContain("draft");
  });
});
