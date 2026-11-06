// The consent tick the learner sees on the callback form, as DATA ONLY (D71). Two texts: the learner's own, and the
// parent or guardian's for a learner under 18 (the parent logs in, so the verified OTP is the consent evidence).
// DRAFT: exact wording needs the client's lawyer (open-questions.md). Versioned like the report wording: a lead stores
// the version it was accepted under, so we can show which text was ticked. A shipped version may be edited in place
// only until the first real lead is stored; after that a change is a new entry here. Never delete a used version.
export type ConsentRole = "learner" | "parent";

export type ConsentCopy = {
  version: string;
  /** True until the lawyer-approved wording replaces this text. */
  draft: boolean;
  texts: Record<ConsentRole, string>;
};

const CONSENT_1_0_0_DRAFT: ConsentCopy = {
  version: "1.0.0-draft",
  draft: true,
  texts: {
    learner: "I agree that the team can call me on this number about my career report and courses.",
    parent:
      "I am the parent or guardian of the learner, and I agree that the team can call me on this number about their career report and courses.",
  },
};

export const CONSENT_COPIES: Readonly<Record<string, ConsentCopy>> = {
  [CONSENT_1_0_0_DRAFT.version]: CONSENT_1_0_0_DRAFT,
};

export const CURRENT_CONSENT: ConsentCopy = CONSENT_1_0_0_DRAFT;

export function getConsentCopy(version: string): ConsentCopy | undefined {
  return Object.hasOwn(CONSENT_COPIES, version) ? CONSENT_COPIES[version] : undefined;
}
