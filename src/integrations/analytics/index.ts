import { env } from "@/lib/env";
import { pickAdapter } from "../pick";
import { fakeAnalytics } from "./fake";
import type { AnalyticsProvider } from "./types";

export type { AnalyticsProvider, EventMap, EventName } from "./types";
export const analytics: AnalyticsProvider = pickAdapter(
  "analytics",
  env.ANALYTICS_PROVIDER,
  { fake: () => fakeAnalytics },
  env.NODE_ENV,
);
