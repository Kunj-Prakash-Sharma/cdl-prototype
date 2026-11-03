// PLACEHOLDER. The client supplies the real self-harm and abuse word list together with the helpline wording
// (docs/open-questions.md, "Helpline link and wording, plus the blocked-word list for the name check"). Until then this
// short list stands in so the flow can be built and tested. Data only: swap or extend it without touching logic.
//
// Known limits: no leetspeak, and no look-alike letters from other scripts (a Cyrillic "s" is not folded to Latin), found in
// the 2026-11-03 review; names in any script are allowed on purpose (Hindi and others). The check is a safety net for a
// distressed learner, not a security control.
// Matching is by whole words and phrases, case-insensitive, ignoring accents and punctuation (see name-check.ts), so a
// harmless name that merely contains a term ("Diego" contains "die") is not blocked.

/** Phrases a learner in distress might type instead of a name. A hit shows the helpline stop screen. */
export const SELF_HARM_TERMS: readonly string[] = [
  "suicide",
  "suicidal",
  "kill myself",
  "end my life",
  "want to die",
  "hurt myself",
  "harm myself",
  "self harm",
  "cut myself",
];

/** Abusive words. A hit is handled like the self-harm terms for now (the spec has one "blocked" outcome). */
export const ABUSE_TERMS: readonly string[] = ["idiot", "stupid", "bastard", "bitch", "asshole", "fuck", "shit"];

export const BLOCKED_NAME_TERMS: readonly string[] = [...SELF_HARM_TERMS, ...ABUSE_TERMS];
