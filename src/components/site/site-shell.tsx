import { Suspense } from "react";
import { Footer } from "@/components/site/footer";
import { Navbar } from "@/components/site/navbar";
import { NavbarSession } from "@/components/site/navbar-session";
import { OfferBar } from "@/components/site/offer-bar";

// The learner-facing frame: offer bar, navbar, page, footer. Used by the (public), (learner) and (quiz) route groups.
// The admin area has its own shell and must not show the public navbar or footer.
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OfferBar />
      <Suspense fallback={<Navbar session={null} />}>
        <NavbarSession />
      </Suspense>
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
