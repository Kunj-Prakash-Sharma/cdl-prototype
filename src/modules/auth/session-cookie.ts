import { getSessionCookie } from "better-auth/cookies";

/**
 * True when the request carries a session cookie. It does NOT check that the session is valid: it is only for the
 * proxy's fast, optimistic redirect. The real check is requireUser() / requireAdmin() in service.ts.
 *
 * Kept out of service.ts on purpose: the proxy imports this, and service.ts would pull the database client into it.
 */
export function hasSessionCookie(request: Request): boolean {
  return getSessionCookie(request) !== null;
}
