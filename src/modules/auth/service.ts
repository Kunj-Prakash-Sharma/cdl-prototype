// PUBLIC interface of modules/auth. Other modules and pages import only this file (never auth.ts, repo.ts, schema.ts).
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { safeNextPath } from "./next-path";
import { maskPhone } from "./phone";
import { USERS_PAGE_SIZE, pageCount, type UserFilters } from "./admin-users";
import { findNamesByUserIds, findPhoneByUserId, listUsers, setUserName, userCounts } from "./repo";
import type { ActionResult, AdminUsersView, SessionView } from "./types";

export type { ActionResult, AdminUserRow, AdminUsersView, AuthErrorCode, Role, SessionView } from "./types";
export type { RoleFilter, UserFilters } from "./admin-users";
export { parseUserFilters } from "./admin-users";

const MAX_NAME_LENGTH = 30;

/** The logged-in learner, or null. Safe to call from server components, actions and route handlers. */
export async function getSession(): Promise<SessionView | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const user = session.user as typeof session.user & { role?: string | null; phoneNumber?: string | null };
  return {
    userId: user.id,
    role: user.role === "admin" ? "admin" : "learner",
    name: user.name,
    phoneMasked: user.phoneNumber ? maskPhone(user.phoneNumber) : "",
  };
}

function loginUrl(returnTo?: string): string {
  if (!returnTo) return "/login";
  const next = safeNextPath(returnTo, "");
  return next ? `/login?next=${encodeURIComponent(next)}` : "/login";
}

/** Pages: redirects to /login (with a safe `?next=`) when nobody is logged in. */
export async function requireUser(returnTo?: string): Promise<SessionView> {
  const session = await getSession();
  if (!session) redirect(loginUrl(returnTo));
  return session;
}

/** Admin pages: a logged-out visitor goes to the admin login page (email + password, with a link to the phone login). */
function adminLoginUrl(returnTo?: string): string {
  const next = returnTo ? safeNextPath(returnTo, "") : "";
  return next ? `/admin/login?next=${encodeURIComponent(next)}` : "/admin/login";
}

/** Pages: like requireUser (but to the admin login page), and sends non-admins home. */
export async function requireAdmin(returnTo?: string): Promise<SessionView> {
  const session = await getSession();
  if (!session) redirect(adminLoginUrl(returnTo));
  if (session.role !== "admin") redirect("/");
  return session;
}

/**
 * Saves the learner's name (used by chat after its own name check; the blocked-word list lives in chat).
 * Here only the basic bounds are enforced: 1 to 30 characters after trimming.
 */
export async function updateProfileName(userId: string, name: string): Promise<ActionResult> {
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > MAX_NAME_LENGTH) return { ok: false, code: "invalid_input" };
  await setUserName(userId, trimmed);
  return { ok: true };
}

/**
 * Admin users list: a page of users plus the stat numbers. Checks the admin role itself (the admin layout
 * guard does not cover other callers). Phones are masked here, so callers never receive a raw number.
 */
export async function listUsersForAdmin(filters: UserFilters): Promise<AdminUsersView> {
  await requireAdmin("/admin/users");
  const [{ rows, total }, stats] = await Promise.all([
    listUsers(filters, USERS_PAGE_SIZE, (filters.page - 1) * USERS_PAGE_SIZE),
    userCounts(new Date()),
  ]);
  return {
    rows: rows.map((row) => ({
      id: row.id,
      phoneMasked: row.phoneNumber ? maskPhone(row.phoneNumber) : "",
      name: row.name,
      role: row.role === "admin" ? "admin" : "learner",
      joinedAt: row.createdAt.toISOString(),
    })),
    total,
    page: filters.page,
    pageCount: pageCount(total),
    stats,
  };
}

/**
 * The learner's raw phone number (E.164), for the one module that must call them: leads. It never goes to a browser or
 * a log. Null when the account has no phone (for example a future email-only login, D65).
 */
export async function getLearnerPhone(userId: string): Promise<string | null> {
  return findPhoneByUserId(userId);
}

/**
 * Profile names by user id, for the admin callback list (leads reads the name live and never copies it). PII: only call
 * it after an admin check, and never log or send the result to analytics. A learner who never gave a name has "".
 */
export async function getUserNames(userIds: string[]): Promise<Map<string, string>> {
  return findNamesByUserIds(userIds);
}
