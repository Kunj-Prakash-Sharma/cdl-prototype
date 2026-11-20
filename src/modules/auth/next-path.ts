/**
 * The `?next=` return path after login. Only same-site relative paths are allowed, so a crafted
 * login link can never send a learner to another site. Anything else falls back to the chat start
 * (a new learner has nothing in My Learning yet; a returning one sees the saved report there).
 */
export const DEFAULT_AFTER_LOGIN = "/discover";

export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    if (url.pathname === "/login" || url.pathname.startsWith("/login/")) return fallback;
    return `${url.pathname}${url.search}`;
  } catch {
    return fallback;
  }
}
