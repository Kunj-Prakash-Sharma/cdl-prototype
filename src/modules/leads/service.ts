// PUBLIC interface of modules/leads. Pages and actions import only this file (never repo.ts, schema.ts, actions.ts).
// Functions never throw for expected cases: they return `{ ok: true, ... }` or `{ ok: false, code }`.
// Rules (D71): a callback needs a finished report; the contact role is derived from the age answer (under 18 means a
// parent or guardian), never asked; consent wording follows that role and its version is stored; a learner has at most
// one NEW request at a time, so repeat taps make one lead and the team is told once.
import { logger } from "@/lib/logger";
import type { SessionView } from "@/modules/auth/service";
import { getCallbackContext, getCallbackContextForAdmin } from "@/modules/chat/service";
import { EXPORT_LIMIT, LEADS_PAGE_SIZE, pageCountFor, type LeadFilters, type StatusFilter } from "./admin-leads";
import { CURRENT_CONSENT } from "./consent-copy";
import { dateIst, dateTimeIst, phoneForScreen, phoneForSheet, toCsv } from "./csv";
import * as repo from "./repo";
import {
  LEAD_STATUSES,
  PREFERRED_TIMES,
  type LeadResult,
  type LeadStatus,
  type LeadView,
  type PreferredTime,
} from "./types";

export type { LeadErrorCode, LeadResult, LeadStatus, LeadView, PreferredTime } from "./types";
export { LEAD_ERROR_CODES, LEAD_STATUSES, PREFERRED_TIMES } from "./types";
export { ALERT_SWEEP_CRON, ALERT_SWEEP_JOB, CALLBACK_ALERT_JOB, alertSweepHandler, callbackAlertHandler } from "./jobs";
export { EXPORT_LIMIT, LEADS_PAGE_SIZE, parseLeadFilters, type LeadFilters, type StatusFilter } from "./admin-leads";

/** Injected by the caller (actions pass auth's getLearnerPhone), so leads never imports auth and tests need no login stack. */
export type PhoneReader = (userId: string) => Promise<string | null>;

const toView = (row: repo.LeadRow): LeadView => ({
  id: row.id,
  status: row.status,
  preferredTime: row.preferredTime,
  createdAt: row.createdAt.toISOString(),
});

/**
 * Called once for a NEW lead, never for a repeat tap. Injected by the caller (actions pass a queue enqueue), so the
 * service needs no queue and tests can watch it.
 */
export type LeadNotifier = (leadId: string) => Promise<void>;

/** What the callback form must show: the consent text for this learner, its version, and whether it is still draft. */
export type ConsentWording = { text: string; version: string; draft: boolean };

/** The consent tick text for this learner, or null when they have no report yet (so no callback form). */
export async function getConsentWording(userId: string): Promise<ConsentWording | null> {
  const context = await getCallbackContext(userId);
  if (!context) return null;
  return { text: CURRENT_CONSENT.text, version: CURRENT_CONSENT.version, draft: CURRENT_CONSENT.draft };
}

export type CreateCallbackInput = { consent: boolean; preferredTime?: PreferredTime | null };

/**
 * Saves a callback request for the learner. Idempotent: if they already have a NEW request, that one comes back with
 * `created: false` (no second lead, no second team email). Only the call that created the lead has `created: true` and
 * calls `notify`. The lead is saved BEFORE the team is told: if notifying fails it is logged (lead id only) and the
 * learner still gets their confirmation, so a queue problem never loses or blocks a request.
 */
export async function createCallback(
  learner: { userId: string },
  input: CreateCallbackInput,
  getPhone: PhoneReader,
  options: { now?: Date; notify?: LeadNotifier } = {},
): Promise<LeadResult<{ lead: LeadView; created: boolean }>> {
  const now = options.now ?? new Date();
  if (input.consent !== true) return { ok: false, code: "consent_required" };
  if (input.preferredTime != null && !PREFERRED_TIMES.includes(input.preferredTime)) {
    return { ok: false, code: "invalid_input" };
  }

  const context = await getCallbackContext(learner.userId);
  if (!context) return { ok: false, code: "no_report" };
  const phone = await getPhone(learner.userId);
  if (!phone) return { ok: false, code: "no_phone" };

  const created = await repo.insertLeadIfNoNew({
    userId: learner.userId,
    attemptId: context.attemptId,
    phone,
    preferredTime: input.preferredTime ?? null,
    consentAt: now,
    consentVersion: CURRENT_CONSENT.version,
  });
  if (created) {
    try {
      await options.notify?.(created.id);
    } catch (err) {
      logger.error("callback alert not queued", {
        leadId: created.id,
        errorName: err instanceof Error ? err.name : "unknown",
      });
    }
    return { ok: true, lead: toView(created), created: true };
  }

  // Another tap (or tab) won: return its row.
  const existing = await repo.findNewLead(learner.userId);
  if (!existing) {
    logger.error("callback request lost: no new lead after a conflict", { userId: learner.userId });
    return { ok: false, code: "unknown" };
  }
  return { ok: true, lead: toView(existing), created: false };
}

// ---- Admin side (E6-S4, E6-S5) ------------------------------------------------------------------------------------
// Every function below takes the logged-in session and refuses anyone who is not an admin: the action does
// `requireAdmin()` first, and this is the second lock. They show the RAW phone (the team has to dial it) and the
// profile name, so nothing here may be logged, sent to analytics or handed to a non-admin page.

/** Profile names by user id. Injected by the caller (actions pass auth's getUserNames), like the phone reader. */
export type NameReader = (userIds: string[]) => Promise<Map<string, string>>;

export type AdminLeadRow = {
  id: string;
  status: LeadStatus;
  requestedAt: string; // ISO date
  name: string; // "" when the learner never gave one
  phone: string; // PII, shown as "+91 98765 43210"
  preferredTime: PreferredTime | null;
  age: string | null;
  studying: string | null;
  goal: string | null;
  topInterests: string[];
  consentAt: string; // ISO date
  consentVersion: string;
};

export type AdminLeadsView = {
  rows: AdminLeadRow[];
  total: number; // matching the filter
  page: number;
  pageCount: number;
  counts: Record<LeadStatus, number>; // over all leads
};

const isAdmin = (session: Pick<SessionView, "role">) => session.role === "admin";

async function toAdminRows(rows: repo.LeadRow[], getNames: NameReader): Promise<AdminLeadRow[]> {
  const names = await getNames([...new Set(rows.map((row) => row.userId))]);
  const contexts = await Promise.all(rows.map((row) => getCallbackContextForAdmin(row.attemptId)));
  return rows.map((row, i) => ({
    id: row.id,
    status: row.status,
    requestedAt: row.createdAt.toISOString(),
    name: names.get(row.userId) ?? "",
    phone: phoneForScreen(row.phone),
    preferredTime: row.preferredTime,
    age: contexts[i]?.age ?? null,
    studying: contexts[i]?.status ?? null,
    goal: contexts[i]?.goal ?? null,
    topInterests: contexts[i]?.topInterests ?? [],
    consentAt: row.consentAt.toISOString(),
    consentVersion: row.consentVersion,
  }));
}

/** One page of callback requests, newest first, with the status filter and the count per status. */
export async function listLeadsForAdmin(
  session: Pick<SessionView, "role">,
  filters: LeadFilters,
  getNames: NameReader,
): Promise<LeadResult<{ view: AdminLeadsView }>> {
  if (!isAdmin(session)) return { ok: false, code: "forbidden" };
  const [{ rows, total }, counts] = await Promise.all([
    repo.listLeads(filters.status, LEADS_PAGE_SIZE, (filters.page - 1) * LEADS_PAGE_SIZE),
    repo.countByStatus(),
  ]);
  return {
    ok: true,
    view: {
      rows: await toAdminRows(rows, getNames),
      total,
      page: filters.page,
      pageCount: pageCountFor(total),
      counts,
    },
  };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUniqueViolation = (err: unknown) => {
  const e = err as { code?: string; cause?: { code?: string } } | null;
  return e?.code === "23505" || e?.cause?.code === "23505";
};

/** Moves a request between new, contacted and closed. */
export async function setLeadStatus(
  session: Pick<SessionView, "role">,
  leadId: string,
  status: string,
  now: Date = new Date(),
): Promise<LeadResult<{ lead: LeadView }>> {
  if (!isAdmin(session)) return { ok: false, code: "forbidden" };
  if (!UUID.test(leadId) || !LEAD_STATUSES.some((s) => s === status)) return { ok: false, code: "invalid_input" };
  try {
    const row = await repo.updateStatus(leadId, status as LeadStatus, now);
    return row ? { ok: true, lead: toView(row) } : { ok: false, code: "not_found" };
  } catch (err) {
    // Putting a lead back to "new" while the same learner already has another new one hits the one-new-per-learner rule.
    if (isUniqueViolation(err)) return { ok: false, code: "conflict" };
    throw err;
  }
}

const CSV_HEADERS = [
  "Requested at",
  "Status",
  "Name",
  "Phone",
  "Preferred time",
  "Age",
  "Studying or working",
  "Goal",
  "Top interests",
  "Consent given at",
  "Consent wording version",
] as const;

const cap = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

/**
 * The callback list as a CSV that opens cleanly in Excel (see csv.ts): newest first, at most EXPORT_LIMIT rows, in the
 * status filter chosen. `truncated` says when more rows matched than were written.
 */
export async function exportLeadsCsv(
  session: Pick<SessionView, "role">,
  status: StatusFilter,
  getNames: NameReader,
  now: Date = new Date(),
): Promise<LeadResult<{ csv: string; filename: string; count: number; truncated: boolean }>> {
  if (!isAdmin(session)) return { ok: false, code: "forbidden" };
  const { rows, total } = await repo.listLeads(status, EXPORT_LIMIT, 0);
  const rowsForSheet = await toAdminRows(rows, getNames);
  const csv = toCsv(
    CSV_HEADERS,
    rowsForSheet.map((row, i) => [
      dateTimeIst(new Date(row.requestedAt)),
      cap(row.status),
      row.name,
      phoneForSheet(rows[i]!.phone),
      row.preferredTime ? cap(row.preferredTime) : "",
      row.age ?? "",
      row.studying ?? "",
      row.goal ?? "",
      row.topInterests.join(" / "),
      dateTimeIst(new Date(row.consentAt)),
      row.consentVersion,
    ]),
  );
  return {
    ok: true,
    csv,
    filename: `callbacks-${dateIst(now)}.csv`,
    count: rows.length,
    truncated: total > rows.length,
  };
}

/** Users (of these ids) that have a lead. The guest clean-up (D80) never deletes one of them, even if a guest somehow got a lead. */
export async function userIdsWithLeads(userIds: string[]): Promise<string[]> {
  return repo.findUserIdsWithLeads(userIds);
}
