import type { JobHandler } from "@/integrations/queue";
import { CALLBACK_ALERT_JOB, callbackAlertHandler } from "@/modules/leads/service";

/** Job name -> handler. Modules add their jobs here (e.g. "email.send", "video.sync"). */
export const handlers: Record<string, JobHandler> = {
  [CALLBACK_ALERT_JOB]: callbackAlertHandler,
};
