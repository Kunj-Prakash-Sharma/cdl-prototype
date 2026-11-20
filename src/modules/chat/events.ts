// Funnel events for the chat (docs/requirements/architecture.md, "Analytics events"). The session id is the attempt id.
// Properties are stages, counts, seconds and fixed codes only: never a name, an answer value or any text (D18).
// Analytics is a side effect: it must never slow down, fail or retry the learner's request, so errors are logged
// (no personal data) and swallowed, and nothing waits for the call.
import { analytics, type EventMap, type EventName } from "@/integrations/analytics";
import { logger } from "@/lib/logger";

export function trackChat<E extends EventName>(attemptId: string, event: E, props: EventMap[E]): void {
  const onError = (err: unknown) => logger.warn("analytics event failed", { event, error: err });
  try {
    void Promise.resolve(analytics.track(attemptId, event, props)).catch(onError);
  } catch (err) {
    onError(err);
  }
}

/** Whole seconds from `from` to `to`, never negative (clocks of two app instances can disagree a little). */
export function secondsBetween(from: Date, to: Date): number {
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000));
}
