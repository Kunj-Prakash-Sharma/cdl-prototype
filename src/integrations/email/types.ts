/** Phase 1 sends exactly two emails. Templates are ours; the provider only delivers. */
export interface EmailTemplates {
  receipt: {
    orderId: string;
    items: { title: string; amountPaise: number }[];
    totalPaise: number;
  };
  callback_alert: {
    leadId: string;
    reportId: string;
    phone: string;
    requestedAt: string;
    /** Who to ask for on the call: the learner, or a parent or guardian when the learner is under 18 (D71). */
    speakTo: "learner" | "parent";
    preferredTime: string | null;
    age: string | null;
    topInterests: string[];
  };
}

export type TemplateName = keyof EmailTemplates;

export interface EmailProvider {
  send<T extends TemplateName>(template: T, to: string, data: EmailTemplates[T]): Promise<void>;
}
