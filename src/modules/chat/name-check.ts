// The name is the only free text in the chat (D46). This validates it: letters, max 30, and a blocked-word check.
// Pure: no database, no env, no clock. The saved name goes to the learner profile through the auth service; chat
// never stores it (D18). Spec: docs/specs/chat.md ("name-check.ts") and its edge cases.
import { NAME_BLOCKLISTS, type NameBlocklists } from "./name-blocklist";

/** auth's `updateProfileName` accepts 1 to 30 characters counted as JS string length, so chat never allows more. */
export const MAX_NAME_LENGTH = 30;

/** "blocked" = a self-harm phrase (helpline stop); "abusive" = an abuse word (ask again); "format" = not a valid name. */
export type NameCheck = { ok: true; value: string } | { ok: false; reason: "format" | "blocked" | "abusive" };

// A letter first, then letters, combining marks (vowel signs in Hindi and other scripts), spaces, apostrophes (straight
// or curly) and hyphens. No digits, symbols, emoji or control characters.
const VALID_NAME = /^\p{L}[\p{L}\p{M} '’-]*$/u;

// Only these scripts (Latin, the nine main Indian scripts, and Arabic for Urdu), and one script per word. This closes the
// look-alike bypass ("ѕuicide" with a Cyrillic ѕ) without a table of look-alikes, and still allows "आशा Verma" (a Hindi
// first name with an English surname: different words, each in one script).
const ALLOWED_SCRIPTS = [
  "Latin",
  "Devanagari",
  "Bengali",
  "Gurmukhi",
  "Gujarati",
  "Oriya",
  "Tamil",
  "Telugu",
  "Kannada",
  "Malayalam",
  "Arabic",
] as const;
const SCRIPT_TESTS = ALLOWED_SCRIPTS.map((script) => new RegExp(`\\p{Script=${script}}`, "u"));
const MARK = /\p{M}/u;

/** True when every word uses letters of one allowed script (marks follow their letter and are not counted). */
function usesAllowedScripts(value: string): boolean {
  for (const word of value.split(/[ '’-]+/)) {
    let found = -1;
    for (const char of word) {
      if (MARK.test(char)) continue;
      const index = SCRIPT_TESTS.findIndex((test) => test.test(char));
      if (index === -1) return false;
      if (found === -1) found = index;
      else if (found !== index) return false;
    }
  }
  return true;
}

/** Lowercase words with accents, punctuation and digits removed, so "Sûicide." and "SUICIDE" compare equal. */
function words(text: string): string[] {
  return text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}]+/gu, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
}

function isBlocked(raw: string, terms: readonly string[]): boolean {
  const tokens = words(raw);
  if (tokens.length === 0) return false;
  const spaced = ` ${tokens.join(" ")} `;
  const squashed = tokens.join("");
  return terms.some((term) => {
    const termWords = words(term);
    if (termWords.length === 0) return false;
    // whole word or phrase ("want to die" inside "i want to die tonight"), never a substring of a longer word
    if (spaced.includes(` ${termWords.join(" ")} `)) return true;
    // letters spread out with spaces or dots: "k i l l  m y s e l f"
    return tokens.length > 1 && squashed === termWords.join("");
  });
}

/**
 * Checks the typed name. The word checks run first and on the raw text, so a learner who types a self-harm phrase gets
 * the helpline stop even when it has punctuation or is longer than 30 characters. A good name comes back normalised
 * (NFKC, so fullwidth or styled Latin letters become plain letters), trimmed, with runs of spaces collapsed to one.
 */
export function validateName(raw: string, lists: NameBlocklists = NAME_BLOCKLISTS): NameCheck {
  if (typeof raw !== "string") return { ok: false, reason: "format" };
  if (isBlocked(raw, lists.selfHarm)) return { ok: false, reason: "blocked" };
  if (isBlocked(raw, lists.abuse)) return { ok: false, reason: "abusive" };

  const value = raw.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (value.length < 1 || value.length > MAX_NAME_LENGTH || !VALID_NAME.test(value) || !usesAllowedScripts(value)) {
    return { ok: false, reason: "format" };
  }
  return { ok: true, value };
}
