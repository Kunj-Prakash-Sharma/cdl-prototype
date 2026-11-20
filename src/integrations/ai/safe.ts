import { logger } from "@/lib/logger";
import type { AiProvider, RewordInput } from "./types";

function timeout(ms: number): Promise<never> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("AI reword timed out")), ms));
}

/**
 * The chat never breaks because of the AI: on any error, timeout, cap or empty answer we return the
 * approved wording unchanged.
 */
export async function rewordWithFallback(adapter: AiProvider, input: RewordInput, timeoutMs: number): Promise<string> {
  try {
    const out = await Promise.race([adapter.rewordQuestion(input), timeout(timeoutMs)]);
    return out.trim() || input.text;
  } catch {
    logger.warn("ai reword failed; using approved wording", { questionId: input.questionId });
    return input.text;
  }
}
