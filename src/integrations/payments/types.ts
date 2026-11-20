/** Amounts are integer paise, never floats. */
export type PaymentEventType = "payment.succeeded" | "payment.failed" | "refund.processed";

export interface PaymentEvent {
  /** Unique per delivery at the gateway; used to ignore repeated webhooks. */
  eventId: string;
  type: PaymentEventType;
  /** The gateway's reference for the payment or order. Store as `provider_ref`. */
  providerRef: string;
  /** Our own order id, echoed back by the gateway. */
  orderId: string;
  amountPaise: number;
  occurredAt: Date;
}

/** Opaque data the browser needs to open the hosted checkout. Only the client adapter reads it. */
export interface CheckoutParams {
  provider: string;
  [key: string]: unknown;
}

export type PaymentStatus = "created" | "paid" | "failed" | "refunded";

export interface PaymentsProvider {
  createOrder(input: {
    orderId: string;
    amountPaise: number;
    currency: "INR";
  }): Promise<{ providerRef: string; checkout: CheckoutParams }>;
  /** Verifies the signature and maps the payload to our event. Throws if the signature is invalid. */
  parseWebhook(rawBody: string, headers: Record<string, string | undefined>): PaymentEvent | null;
  getStatus(providerRef: string): Promise<PaymentStatus>;
  refund(providerRef: string, amountPaise: number): Promise<{ refundRef: string }>;
}
