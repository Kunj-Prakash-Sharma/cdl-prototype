export interface RewordInput {
  /** Fixed question id; the answer is always stored against this, never against the reworded text. */
  questionId: string;
  /** The client-approved wording. */
  text: string;
  firstName?: string;
}

/** The AI only rewords a fixed question. It never sees answers or scores and never makes decisions. */
export interface AiProvider {
  rewordQuestion(input: RewordInput): Promise<string>;
}
