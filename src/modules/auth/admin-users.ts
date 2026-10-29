// Pure helpers for the admin users list: turn raw URL params into safe filters. No database, no Next.

export const USERS_PAGE_SIZE = 20;
const MAX_QUERY_LENGTH = 30;
const MAX_PAGE = 10_000;

export type RoleFilter = "all" | "learner" | "admin";
export type UserFilters = { q: string; role: RoleFilter; page: number };

type Param = string | string[] | undefined;
const first = (value: Param) => (Array.isArray(value) ? value[0] : value);

/** Never trusts the URL: unknown roles become "all", bad pages become 1, the search text is trimmed and capped. */
export function parseUserFilters(params: { q?: Param; role?: Param; page?: Param }): UserFilters {
  const q = (first(params.q) ?? "").trim().slice(0, MAX_QUERY_LENGTH);
  const roleRaw = first(params.role);
  const role: RoleFilter = roleRaw === "learner" || roleRaw === "admin" ? roleRaw : "all";
  const pageRaw = Number.parseInt(first(params.page) ?? "1", 10);
  const page = Number.isFinite(pageRaw) ? Math.min(Math.max(pageRaw, 1), MAX_PAGE) : 1;
  return { q, role, page };
}

/** Escapes `%`, `_` and `\` so the admin's search text is matched literally by LIKE. */
export function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, "\\$&");
}

export function pageCount(total: number, pageSize = USERS_PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / pageSize));
}
