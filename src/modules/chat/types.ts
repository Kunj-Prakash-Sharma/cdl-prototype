// Safe to import from client components: types and constants only, no server code.
// The UI renders what a NextStep carries (text, labels, progress). It never knows question IDs, counts, stage names
// or wording: all of that comes from the question set, so changing the set changes no UI code (D68).
import type { Stage } from "./question-set";

/** "basics" holds the name and the tap questions about the learner; the others come from the set. */
export type StageId = "basics" | Stage;

export type StageProgress = { id: StageId; answered: number; total: number };
export type Progress = { answered: number; total: number; stages: StageProgress[] };

export type ScaleView = { prompt: string; labels: readonly string[] };

export type NextStep =
  | { kind: "name"; id: string; prompt: string; progress: Progress }
  | {
      kind: "basics";
      id: string;
      prompt: string;
      /** `index` is what the learner sends back; the stored answer is that position. */
      options: { index: number; label: string }[];
      progress: Progress;
    }
  | {
      kind: "question";
      id: string;
      stage: Stage;
      variantId: string;
      text: string;
      scale: ScaleView;
      progress: Progress;
    }
  | { kind: "done"; progress: Progress };

/** Codes are the contract; the UI owns all wording (same idea as auth's error codes). */
export const CHAT_ERROR_CODES = [
  "invalid_input", // unknown question, value outside its scale or option list
  "not_found", // no such attempt, or it belongs to someone else (the same answer, so ids cannot be probed)
  "attempt_closed", // the attempt is completed or abandoned
  "out_of_order", // a question that is not reached yet
  "incomplete", // finish was called before every question was answered
  "stage_invalid", // a stage's answers were all the same: ask that part again
  "not_allowed", // for example retrying a stage that is not marked invalid
  "unknown", // anything unexpected (for example an attempt whose question set is missing)
] as const;
export type ChatErrorCode = (typeof CHAT_ERROR_CODES)[number];

export type ChatResult<T extends object = object> =
  ({ ok: true } & T) | { ok: false; code: ChatErrorCode; stage?: Stage };

export type Learner = {
  userId: string;
  /** Empty until the learner gives it. Decides whether the name step is still ahead. */
  name: string;
};
