/**
 * The only events Phase 1 sends (docs/requirements/architecture.md). Properties must never hold
 * names, phone numbers, emails or free text. `sessionId` is the pseudonymous chat/session id.
 */
export interface EventMap {
  home_viewed: { trafficSource?: string; deviceType?: string };
  chat_started: { source?: string };
  otp_sent: { result: "ok" | "failed"; attempt: number };
  otp_verified: { result: "ok" | "failed"; attempt: number };
  chat_step: {
    stage: string;
    messageNumber: number;
    inputType: "single" | "multi" | "likert" | "name";
    secondsTaken: number;
  };
  chat_exited: { lastStage: string; lastMessageNumber: number };
  report_viewed: { scoresPresent: boolean; coursesSuggested: number };
  report_action: { action: "save" | "pdf" | "callback" | "courses" };
  course_viewed: { courseId: string };
  preview_played: { courseId: string };
  checkout_started: { productId: string; amountPaise: number };
  payment_succeeded: { productId: string; amountPaise: number; gatewayResult: string };
  payment_failed: { productId: string; amountPaise: number; gatewayResult: string };
  lesson_completed: { courseId: string; lessonId: string };
}

export type EventName = keyof EventMap;

export interface AnalyticsProvider {
  track<E extends EventName>(sessionId: string, event: E, props: EventMap[E]): void | Promise<void>;
}
