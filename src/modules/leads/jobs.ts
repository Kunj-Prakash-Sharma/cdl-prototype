// The background job that tells the team about a new callback request (E6-S3). It runs in the worker (pg-boss), so a
// failed email never loses the lead: the lead is saved first, and a job that throws is retried by the queue.
// PII rule: the email carries the phone (the team has to dial it) and no name; logs and errors carry the lead id only.
import { z } from "zod";
import { email, type EmailProvider } from "@/integrations/email";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getCallbackContextForAdmin } from "@/modules/chat/service";
import { phoneForScreen } from "./csv";
import * as repo from "./repo";

export const CALLBACK_ALERT_JOB = "leads.callback_alert";

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

/** The handler the worker registers (worker/handlers.ts). */
export const callbackAlertHandler = (payload: unknown) =>
  sendCallbackAlert(payload, { to: env.CALLBACK_ALERT_EMAIL, send: email.send.bind(email) });
