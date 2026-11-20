import { env } from "@/lib/env";
import { pickAdapter } from "../pick";
import { fakePayments } from "./fake";
import type { PaymentsProvider } from "./types";

export type { CheckoutParams, PaymentEvent, PaymentEventType, PaymentStatus, PaymentsProvider } from "./types";
// Client side: `openCheckout(checkout: CheckoutParams)` is added with the checkout feature.
export const payments: PaymentsProvider = pickAdapter(
  "payments",
  env.PAYMENTS_PROVIDER,
  { fake: () => fakePayments },
  env.NODE_ENV,
);
