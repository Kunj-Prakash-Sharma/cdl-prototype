// Pure helpers for the admin callback list: turn raw URL params into safe filters. No database, no Next.
import { LEAD_STATUSES, type LeadStatus } from "./types";

export const LEADS_PAGE_SIZE = 20;
const MAX_PAGE = 10_000;
/** The download stops here, so one click can never load an unbounded table into memory. */
export const EXPORT_LIMIT = 2_000;

export type StatusFilter = LeadStatus | "all";
export type LeadFilters = { status: StatusFilter; page: number };

type Param = string | string[] | undefined;
const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

/** Never trusts the URL: an unknown status becomes "all", a bad page becomes 1. */
export function parseLeadFilters(params: { status?: Param; page?: Param }): LeadFilters {
  const raw = first(params.status);
  const status: StatusFilter = LEAD_STATUSES.find((s) => s === raw) ?? "all";
  const pageRaw = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isFinite(pageRaw) ? Math.min(Math.max(pageRaw, 1), MAX_PAGE) : 1;
  return { status, page };
}

export function pageCountFor(total: number, pageSize = LEADS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
