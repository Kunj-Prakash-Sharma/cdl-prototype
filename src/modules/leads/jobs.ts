// The background job that tells the team about a new callback request (E6-S3). It runs in the worker (pg-boss), so a
// failed email never loses the lead: the lead is saved first, and a job that throws is retried by the queue.
// PII rule: the email carries the phone (the team has to dial it) and no name; logs and errors carry the lead id only.
import { z } from "zod";
import { email, type EmailProvider } from "@/integrations/email";
import { queue } from "@/integrations/queue";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCallbackContextForAdmin } from "@/modules/chat/service";
import { phoneForScreen } from "./csv";
import * as repo from "./repo";

export const CALLBACK_ALERT_JOB = "leads.callback_alert";
export const ALERT_SWEEP_JOB = "leads.alert_sweep";
/** Every 5 minutes (UTC cron, 5 fields). The worker registers it (worker/handlers.ts). */
export const ALERT_SWEEP_CRON = "*/5 * * * *";

// D76: a lead is swept once it is old enough not to race its own alert job, and only for a few days (a missing
// CALLBACK_ALERT_EMAIL must not be retried for ever; the lead stays in the admin list).
const SWEEP_MIN_AGE_MS = 5 * 60 * 1000;
const SWEEP_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
const SWEEP_BATCH = 50;

const payloadSchema = z.object({ leadId: z.string().uuid() });

export type AlertDeps = {
  /** The team address. Missing is a configuration error: the job throws, so it is retried and shows up in the logs. */
  to: string | undefined;
  send: EmailProvider["send"];
  now?: () => Date;
};

export async function sendCallbackAlert(payload: unknown, deps: AlertDeps): Promise<void> {
  const parsed = payloadSchema.safeParse(payload);
  if (!parsed.success) {
    // A malformed job can never become valid: drop it (retrying would loop forever).
    logger.error("callback alert job has a bad payload");
    return;
  }
  const lead = await repo.getLead(parsed.data.leadId);
  if (!lead) {
    logger.warn("callback alert: lead no longer exists", { leadId: parsed.data.leadId });
    return;
  }
  if (lead.alertedAt) return; // a retry after the email already went out

  if (!deps.to) {
    logger.error("callback alert: CALLBACK_ALERT_EMAIL is not set", { leadId: lead.id });
    throw new Error("CALLBACK_ALERT_EMAIL is not set");
  }

  const context = await getCallbackContextForAdmin(lead.attemptId);
  try {
    await deps.send("callback_alert", deps.to, {
      leadId: lead.id,
      reportId: lead.attemptId,
      phone: phoneForScreen(lead.phone),
      requestedAt: lead.createdAt.toISOString(),
      speakTo: lead.contactRole,
      preferredTime: lead.preferredTime,
      age: context?.age ?? null,
      topInterests: context?.topInterests ?? [],
    });
  } catch (err) {
    // The error text may name the recipient or the payload, so only the lead id is logged. The queue retries.
    logger.error("callback alert email failed", {
      leadId: lead.id,
      errorName: err instanceof Error ? err.name : "unknown",
    });
    throw err;
  }
  await repo.markAlerted(lead.id, (deps.now ?? (() => new Date()))());
}

export type SweepDeps = {
  /** Queues the alert job for one lead. */
  enqueue: (leadId: string) => Promise<void>;
  now?: () => Date;
};

/**
 * Re-queues the team alert for leads that were saved but never alerted: queueing failed when the request came in, or
 * the alert job ran out of retries. Safe to run often: the alert job skips a lead that is already alerted. Returns how
 * many leads were queued. One lead that cannot be queued is logged (lead id only) and does not stop the rest.
 */
export async function sweepUnalertedLeads(deps: SweepDeps): Promise<number> {
  const now = (deps.now ?? (() => new Date()))().getTime();
  const ids = await repo.findUnalertedLeadIds({
    olderThan: new Date(now - SWEEP_MIN_AGE_MS),
    newerThan: new Date(now - SWEEP_MAX_AGE_MS),
    limit: SWEEP_BATCH,
  });
  let queued = 0;
  for (const leadId of ids) {
    try {
      await deps.enqueue(leadId);
      queued++;
    } catch (err) {
      logger.error("alert sweep: could not queue", { leadId, errorName: err instanceof Error ? err.name : "unknown" });
    }
  }
  if (queued > 0) logger.warn("alert sweep re-queued unalerted leads", { count: queued });
  return queued;
}

/** The handler the worker registers for the sweep (worker/handlers.ts). */
export const alertSweepHandler = () =>
  sweepUnalertedLeads({
    enqueue: (leadId) => queue.enqueue(CALLBACK_ALERT_JOB, { leadId }, { singletonKey: leadId }),
  }).then(() => undefined);

/** The handler the worker registers (worker/handlers.ts). */
export const callbackAlertHandler = (payload: unknown) =>
  sendCallbackAlert(payload, { to: env.CALLBACK_ALERT_EMAIL, send: email.send.bind(email) });
