import { GUEST_CLEANUP_CRON, GUEST_CLEANUP_JOB, guestCleanupHandler } from "./guest-cleanup";
import type { JobHandler } from "@/integrations/queue";
import { VIDEO_PURGE_JOB, videoPurgeHandler } from "@/modules/catalog/service";
import {
  ALERT_SWEEP_CRON,
  ALERT_SWEEP_JOB,
  CALLBACK_ALERT_JOB,
  alertSweepHandler,
  callbackAlertHandler,
} from "@/modules/leads/service";

/** Job name -> handler. Modules add their jobs here (e.g. "email.send", "video.sync"). */
export const handlers: Record<string, JobHandler> = {
  [CALLBACK_ALERT_JOB]: callbackAlertHandler,
  [ALERT_SWEEP_JOB]: alertSweepHandler,
  [GUEST_CLEANUP_JOB]: guestCleanupHandler,
  [VIDEO_PURGE_JOB]: videoPurgeHandler,
};

/** Job name -> cron (UTC). Every scheduled job must also be in `handlers`. */
export const schedules: Record<string, string> = {
  [ALERT_SWEEP_JOB]: ALERT_SWEEP_CRON,
  [GUEST_CLEANUP_JOB]: GUEST_CLEANUP_CRON,
};
