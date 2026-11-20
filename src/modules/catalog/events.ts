// Analytics for video (preview_played, lesson_completed). A side effect: it must never slow down, fail or retry the
// learner's request, so errors are logged (no personal data) and swallowed. Properties are ids only; never the
// watermark id, a URL, a name or a phone.
import { analytics, type EventMap, type EventName } from "@/integrations/analytics";
import { logger } from "@/lib/logger";

export function trackVideo<E extends EventName>(sessionId: string, event: E, props: EventMap[E]): void {
  const onError = (err: unknown) => logger.warn("analytics event failed", { event, error: err });
  try {
    void Promise.resolve(analytics.track(sessionId, event, props)).catch(onError);
  } catch (err) {
    onError(err);
  }
}
