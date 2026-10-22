import { logger } from "@/lib/logger";
import type { AnalyticsProvider } from "./types";

export const fakeAnalytics: AnalyticsProvider = {
  track(sessionId, event, props) {
    logger.debug("analytics event", { event, sessionId, props });
  },
};
