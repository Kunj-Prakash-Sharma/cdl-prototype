import type { PaymentEvent, PaymentsProvider } from "./types";

// Dev/test only. A webhook is "signed" when it carries the header `x-fake-signature: valid`.
export const fakePayments: PaymentsProvider = {
  async createOrder({ orderId }) {
    return { providerRef: `fake_order_${orderId}`, checkout: { provider: "fake", orderId } };
  },
  parseWebhook(rawBody, headers) {
    if (headers["x-fake-signature"] !== "valid") throw new Error("Invalid webhook signature");
    const body = JSON.parse(rawBody) as Omit<PaymentEvent, "occurredAt"> & { occurredAt: string };
    return { ...body, occurredAt: new Date(body.occurredAt) };
  },
  async getStatus() {
    return "created";
  },
  async refund(providerRef) {
    return { refundRef: `fake_refund_${providerRef}` };
  },
};
