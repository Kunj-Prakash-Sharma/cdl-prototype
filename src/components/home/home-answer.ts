// The Home mini-chat answer (D87), kept in this browser tab until the quiz opens. Nothing is saved on our side before
// then: the quiz sends it once with `applyHomeAnswer` and the server checks it (and only applies it to a quiz with no
// answers yet). Storage can be missing or blocked (private mode, previews), so every access is guarded and a failure
// just means the question is asked again.
//
// So that an answer the learner walked away from is not applied to some later quiz in the same tab (or in a tab
// duplicated from it), it expires after a few minutes, and Home forgets it whenever it shows the replies again.
const KEY = "home-answer";
export const HOME_ANSWER_TTL_MS = 10 * 60 * 1000;

type Kept = { id: string; at: number };

export function keepHomeAnswer(optionId: string, now = Date.now()): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ id: optionId, at: now } satisfies Kept));
  } catch {
    // The quiz asks the question again.
  }
}

/** Forgets a kept answer (Home calls this when it shows the replies, so only a fresh tap counts). */
export function forgetHomeAnswer(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing kept.
  }
}

/** Reads the kept answer and forgets it, so it is sent at most once. Null when none, unreadable or too old. */
export function takeHomeAnswer(now = Date.now()): string | null {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const kept = JSON.parse(raw) as Partial<Kept>;
    if (typeof kept.id !== "string" || typeof kept.at !== "number") return null;
    const age = now - kept.at;
    return age >= 0 && age <= HOME_ANSWER_TTL_MS ? kept.id : null;
  } catch {
    return null;
  }
}
