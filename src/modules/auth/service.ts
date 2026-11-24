// PUBLIC interface of modules/auth. Other modules and pages import only this file (never auth.ts, repo.ts, schema.ts).
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { safeNextPath } from "./next-path";
import { maskPhone } from "./phone";
import { USERS_PAGE_SIZE, pageCount, type UserFilters } from "./admin-users";
import { GUEST_TTL_DAYS } from "./limits";
import {
  deleteGuestUsers,
  findGuestsCreatedBefore,
  findLinkedGuestIds,
  findNamesByUserIds,
  findPhoneByUserId,
  listUsers,
  setUserName,
  userCounts,
} from "./repo";
import type { ActionResult, AdminUsersView, SessionView, VisitorView } from "./types";

export type {
  ActionResult,
  AdminUserRow,
  AdminUsersView,
  AuthErrorCode,
  Role,
  SessionView,
  VisitorView,
} from "./types";
export type { RoleFilter, UserFilters } from "./admin-users";
export { parseUserFilters } from "./admin-users";
export { safeNextPath } from "./next-path";

const MAX_NAME_LENGTH = 30;

type SessionUser = {
  id: string;
  name: string;
  role?: string | null;
  phoneNumber?: string | null;
  isAnonymous?: boolean | null;
};

async function currentUser(): Promise<SessionUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session ? (session.user as SessionUser) : null;
}

/**
 * The logged-in learner, or null. A GUEST (anonymous user, D80) counts as logged out here, so every page, action and
 * navbar that asks "who is logged in?" treats a guest as nobody. Only the quiz uses getVisitor() instead.
 * Safe to call from server components, actions and route handlers.
 */
export async function getSession(): Promise<SessionView | null> {
  const user = await currentUser();
  if (!user || user.isAnonymous) return null;
  return {
    userId: user.id,
    role: user.role === "admin" ? "admin" : "learner",
    name: user.name,
    phoneMasked: user.phoneNumber ? maskPhone(user.phoneNumber) : "",
  };
}

/** A verified learner OR a guest, for the quiz only (D80). Everything that costs money or holds records uses getSession(). */
export async function getVisitor(): Promise<VisitorView | null> {
  const user = await currentUser();
  return user ? { userId: user.id, isGuest: Boolean(user.isAnonymous), name: user.name } : null;
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

/**
 * For the quiz (D80): a verified learner or a guest. With nobody there it sends the visitor to /discover, where the Start
 * button makes the guest (never made on page load). Never use this for buying, callbacks or video: those use requireUser().
 */
export async function requireLearnerOrGuest(): Promise<VisitorView> {
  const visitor = await getVisitor();
  if (!visitor) redirect("/discover");
  return visitor;
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

/**
 * Guests that verified a phone and became this learner (D80). The chat re-points its rows from each of them to `userId`
 * (lazily and idempotently), so the quiz survives whether they verified at the report gate or on /login.
 */
export async function linkedGuestIds(userId: string): Promise<string[]> {
  return findLinkedGuestIds(userId);
}

/**
 * Guests older than the guest lifetime (7 days, D80), oldest first, each with the learner it became (or null). The worker
 * lets the other modules claim the rows of a linked guest first, then deletes the guests.
 */
export async function expiredGuests(now: Date, limit = 200): Promise<{ id: string; linkedUserId: string | null }[]> {
  return findGuestsCreatedBefore(new Date(now.getTime() - GUEST_TTL_DAYS * 24 * 60 * 60 * 1000), limit);
}

/** Deletes guests only; a real user's id given by mistake deletes nothing. Returns how many were removed. */
export async function deleteGuests(ids: string[]): Promise<number> {
  return deleteGuestUsers(ids);
}
