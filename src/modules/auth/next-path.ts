/**
 * The `?next=` return path after login. Only same-site relative paths are allowed, so a crafted
 * login link can never send a learner to another site. Anything else falls back to the chat start
 * (a new learner has nothing in My Learning yet; a returning one sees the saved report there).
 */
export const DEFAULT_AFTER_LOGIN = "/discover";

/**
 * The normalised result must be one site-relative path: a single "/" not followed by another
 * slash or backslash, raw or percent-encoded ("//x", "/\x", "/%2Fx", "/%5Cx" can all be read as
 * another host). Checked on the result, because normalisation turns "/.//x" into "//x".
 */
const SITE_RELATIVE = /^\/(?![/\\]|%2f|%5c)/i;

/** Pages that are never a destination after login (case and trailing slash ignored). */
const LOGIN_PAGES = ["/login", "/admin/login"];

function isLoginPage(pathname: string): boolean {
  const p = pathname.toLowerCase();
  return LOGIN_PAGES.some((page) => p === page || p.startsWith(`${page}/`));
}

export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  if (!raw || !raw.startsWith("/") || raw.includes("\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(raw)) return fallback;
  try {
    const url = new URL(raw, "http://local.invalid");
    if (url.origin !== "http://local.invalid") return fallback;
    const result = `${url.pathname}${url.search}`;
    if (!SITE_RELATIVE.test(result) || result.includes("\\")) return fallback;
    if (isLoginPage(url.pathname)) return fallback;
    return result;
  } catch {
    return fallback;
  }
}
