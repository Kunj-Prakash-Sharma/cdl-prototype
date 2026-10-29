import { Suspense } from "react";
import { SiteShell } from "@/components/site/site-shell";
import { requireUser } from "@/modules/auth/service";

// Reading the session is request-time work, so the guard sits inside Suspense (Cache Components).
// Children render only after the guard passes: it redirects to /login when the session is not real.
async function Guard({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}

// Every learner page needs a logged-in user. proxy.ts redirects when there is no cookie at all;
// the guard checks that the session is real.
export default function LearnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <SiteShell>
      <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
        <Guard>{children}</Guard>
      </Suspense>
    </SiteShell>
  );
}
