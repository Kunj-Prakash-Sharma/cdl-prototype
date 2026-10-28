// PUBLIC interface of modules/auth. Other modules and pages import only this file (never auth.ts, repo.ts, schema.ts).
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { safeNextPath } from "./next-path";
import { maskPhone } from "./phone";
import { setUserName } from "./repo";
import type { ActionResult, SessionView } from "./types";

export type { ActionResult, AuthErrorCode, Role, SessionView } from "./types";

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

/** Pages: like requireUser, and sends non-admins home. */
export async function requireAdmin(returnTo?: string): Promise<SessionView> {
  const session = await requireUser(returnTo);
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
