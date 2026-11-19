"use server";

// Server actions for the callback form. Thin: zod-validate, require a login, rate-limit, call the service, return a
// typed `{ ok, code }`. Expected failures never throw. The learner is always the logged-in user (never an id from the form).
import { z } from "zod";
import { queue } from "@/integrations/queue";
import { createLimiter } from "@/lib/limiter";
import { logger } from "@/lib/logger";
import { getLearnerPhone, getUserNames, requireAdmin, requireUser } from "@/modules/auth/service";
import * as leads from "./service";
import type { LeadResult } from "./types";

// A callback email goes to the team for every NEW lead, so requests are capped per learner (CLAUDE.md: anything that
// sends messages needs a rate limit). The login (phone OTP, with its own bot check) is what stands in for a captcha here.
const CALLBACK_LIMIT_PER_HOUR = 5;
const callbackLimiter = createLimiter(CALLBACK_LIMIT_PER_HOUR, 60 * 60 * 1000);

const requestSchema = z.object({
  consent: z.boolean(),
  preferredTime: z.enum(leads.PREFERRED_TIMES).nullish(),
  // Where the request is made (D85). Missing means the report button.
  source: z.enum(leads.LEAD_SOURCES).default("report"),
});
const sourceSchema = z.enum(leads.LEAD_SOURCES).default("report");

/** Where a login should send the learner back to. A fixed path per source, never taken from the browser. */
const loginReturnPath = (source: leads.LeadSource) => (source === "home" ? "/" : "/discover/report");

const invalid = { ok: false, code: "invalid_input" } as const;

async function guarded<T extends object>(run: () => Promise<LeadResult<T>>): Promise<LeadResult<T>> {
  try {
    return await run();
  } catch (err) {
    // requireUser redirects by throwing an error Next recognises by its digest; let Next handle only those.
    if (err && typeof err === "object" && "digest" in err && String(err.digest).startsWith("NEXT_")) throw err;
    logger.error("callback action failed", { error: err });
    return { ok: false, code: "unknown" };
  }
}

/** The consent tick text for the logged-in learner (from the report page: null when they have no report yet). */
export async function getConsentWording(source?: unknown) {
  const parsed = sourceSchema.safeParse(source);
  const where = parsed.success ? parsed.data : "report";
  const session = await requireUser(loginReturnPath(where));
  return leads.getConsentWording(session.userId, where);
}

export async function requestCallback(input: unknown) {
  const parsed = requestSchema.safeParse(input);
  if (!parsed.success) return invalid;
  return guarded(async () => {
    const session = await requireUser(loginReturnPath(parsed.data.source));
    const limit = callbackLimiter.hit(session.userId, performance.now());
    if (!limit.ok) return { ok: false, code: "rate_limited", retryAfterSec: limit.retryAfterSec } as const;
    return leads.createCallback({ userId: session.userId }, parsed.data, getLearnerPhone, {
      // One job per lead: the same id is never queued twice while one is pending.
      notify: (leadId) => queue.enqueue(leads.CALLBACK_ALERT_JOB, { leadId }, { singletonKey: leadId }),
    });
  });
}

// ---- Admin: callback list, status change, CSV (requireAdmin first on every one; the service checks the role again) ----

const filterSchema = z.object({
  status: z.string().max(20).nullish(),
  page: z.number().int().min(1).max(10_000).nullish(),
});
const statusSchema = z.object({ leadId: z.string().uuid(), status: z.enum(leads.LEAD_STATUSES) });

export async function listCallbacks(input: unknown) {
  const parsed = filterSchema.safeParse(input ?? {});
  if (!parsed.success) return invalid;
  return guarded(async () => {
    const session = await requireAdmin("/admin/callbacks");
    const filters = leads.parseLeadFilters({
      status: parsed.data.status ?? undefined,
      page: String(parsed.data.page ?? 1),
    });
    return leads.listLeadsForAdmin(session, filters, getUserNames);
  });
}

export async function changeLeadStatus(input: unknown) {
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return invalid;
  return guarded(async () => {
    const session = await requireAdmin("/admin/callbacks");
    return leads.setLeadStatus(session, parsed.data.leadId, parsed.data.status);
  });
}

/** Returns the CSV text; the page turns it into a file download. */
export async function exportCallbacks(input: unknown) {
  const parsed = filterSchema.safeParse(input ?? {});
  if (!parsed.success) return invalid;
  return guarded(async () => {
    const session = await requireAdmin("/admin/callbacks");
    const { status } = leads.parseLeadFilters({ status: parsed.data.status ?? undefined });
    return leads.exportLeadsCsv(session, status, getUserNames);
  });
}
