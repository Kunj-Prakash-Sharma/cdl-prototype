import { Suspense } from "react";
import type { Metadata } from "next";
import { HelplineLink } from "@/components/discover/helpline-link";
import { CallbackForm } from "@/components/report/callback-form";
import { ReportView } from "@/components/report/report-view";
import { ButtonLink } from "@/components/ui/button";
import { redirect } from "next/navigation";
import { ReportGate } from "@/components/report/report-gate";
import { env } from "@/lib/env";
import { getSession, getVisitor } from "@/modules/auth/service";
import { getReportForVisitor, trackReportViewed } from "@/modules/chat/service";
import { getConsentWording } from "@/modules/leads/service";

export const metadata: Metadata = {
  title: "Your career report",
};

// Request-time work (session, database) sits in its own Suspense boundary, like the chat page (Cache Components).
export default function ReportPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <Report />
    </Suspense>
  );
}

async function Report() {
  // Whoever is here sees only their own: a guest gets the fixed sample behind the phone gate (their real scores never
  // leave the server), a verified learner gets the newest report, looked up by their user id and never by an id in the URL.
  const visitor = await getVisitor();
  if (!visitor) redirect("/discover");
  const result = await getReportForVisitor(visitor);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">We could not open your report</h1>
        <p className="mt-2 text-muted">Please refresh the page in a moment.</p>
        <HelplineLink className="mt-8 justify-center" />
      </div>
    );
  }

  if (result.gated && result.finished) {
    return <ReportGate sample={result.sample} siteKey={env.TURNSTILE_SITE_KEY ?? "1x00000000000000000000BB"} />;
  }

  if (result.gated || !result.latest) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" data-testid="report-empty">
        <h1 className="text-2xl font-bold text-ink">Your report is not ready yet</h1>
        <p className="mt-2 text-muted">Answer the quick questions and your report will appear here.</p>
        <ButtonLink href="/discover" className="mt-6">
          Start the questions
        </ButtonLink>
        <HelplineLink className="mt-8 justify-center" />
      </div>
    );
  }

  // The page fires the view event itself (the lookup has no side effects, so My SELF and callbacks do not inflate it).
  trackReportViewed(result.latest.attemptId, result.latest.report);
  const session = await getSession(); // a verified learner here (a guest never reaches this line)
  const wording = session ? await getConsentWording(session.userId) : null;
  return (
    <ReportView report={result.latest.report}>{wording && session && <CallbackForm wording={wording} />}</ReportView>
  );
}
