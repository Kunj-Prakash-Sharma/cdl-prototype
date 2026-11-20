// Page copy about the persona (D88), shared by the report screen and its print/PDF version so they cannot drift.
// A flat profile (all interests even) has no top interest type: its persona is the all-round one, and the copy says so.

/** The lead under "Strengths and growth". */
export const personaLead = (flat: boolean) =>
  flat
    ? "What people with an even mix of interests often do well, and what is worth building next."
    : "What people with your top interest type often do well, and what is worth building next.";

/** How the persona was chosen ("About this report" in the PDF). */
export const personaSource = (flat: boolean) =>
  flat
    ? "Your career personality. Your interests came out even, so it is the all-round one rather than one picked from a top interest type."
    : "Your career personality, picked from your strongest interest type.";
