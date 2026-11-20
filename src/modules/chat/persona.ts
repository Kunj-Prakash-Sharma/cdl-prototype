// PURE: which persona a learner gets (D81, D88). Fixed rules, no AI, no database, no clock.
// The persona follows the TOP Holland letter only. `letters` is already in rank order, with ties broken R, I, A, S, E,
// C (scoring.ts), so a tie needs no extra rule here. A flat profile has no letters and gets the generic persona.
import type { PersonaId } from "./report-copy";
import type { Holland } from "./scoring";

export function personaIdFor(holland: Holland): PersonaId {
  if ("flat" in holland) return "explorer";
  return holland.letters[0] ?? "explorer";
}
