import { Navbar } from "@/components/site/navbar";
import { getSession } from "@/modules/auth/service";

// Reading the session is request-time work. The layout wraps this in <Suspense> with the logged-out
// navbar as fallback, so the rest of the page can still be prerendered (Cache Components).
export async function NavbarSession() {
  return <Navbar session={await getSession()} />;
}
