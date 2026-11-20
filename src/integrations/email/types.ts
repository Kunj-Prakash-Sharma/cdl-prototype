/** Phase 1 sends exactly two emails. Templates are ours; the provider only delivers. */
export interface EmailTemplates {
  receipt: {
    orderId: string;
    items: { title: string; amountPaise: number }[];
    totalPaise: number;
  };
  callback_alert: {
    leadId: string;
    /** Empty for a request made from Home (D85). */
    reportId: string | null;
    source: "home" | "report";
    /** False when there is no finished report to read from: the template says "No report yet". */
    hasReport: boolean;
    phone: string;
    requestedAt: string;
    preferredTime: string | null;
    age: string | null;
    /** What the learner loses track of time doing (a tap answer, D89). */
    activity: string | null;
    topInterests: string[];
  };
}

export type TemplateName = keyof EmailTemplates;

export interface EmailProvider {
  send<T extends TemplateName>(template: T, to: string, data: EmailTemplates[T]): Promise<void>;
}
