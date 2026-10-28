import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Fast, optimistic redirect only: it checks that a session cookie EXISTS, not that it is valid.
// The real check is requireUser() / requireAdmin() in modules/auth (Next 16 docs: proxy is not authorization).
export function proxy(request: NextRequest) {
  if (getSessionCookie(request)) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/discover/:path*", "/my-self/:path*", "/admin/:path*"],
};
