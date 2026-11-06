import { describe, expect, it } from "vitest";
import { CONSENT_COPIES, CURRENT_CONSENT, getConsentCopy } from "./consent-copy";

describe("consent wording", () => {
  for (const copy of Object.values(CONSENT_COPIES)) {
    it(`${copy.version}: has a learner text and a parent or guardian text`, () => {
      expect(copy.texts.learner.trim()).not.toBe("");
      expect(copy.texts.parent).toMatch(/parent or guardian/i);
      expect(copy.texts.learner).not.toMatch(/parent|guardian/i);
    });
  }

  it("finds a shipped version, and nothing for an unknown or prototype key", () => {
    expect(getConsentCopy(CURRENT_CONSENT.version)).toBe(CURRENT_CONSENT);
    expect(getConsentCopy("nope")).toBeUndefined();
    expect(getConsentCopy("constructor")).toBeUndefined();
  });

  it("is still draft: this fails on purpose once the lawyer-approved wording goes in (then update it)", () => {
    expect(CURRENT_CONSENT.draft).toBe(true);
  });
});
