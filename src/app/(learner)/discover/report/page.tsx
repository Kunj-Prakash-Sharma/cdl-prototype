import { Suspense } from "react";
import type { Metadata } from "next";
import { HelplineLink } from "@/components/discover/helpline-link";
import { CallbackForm } from "@/components/report/callback-form";
import { ReportView } from "@/components/report/report-view";
import { ButtonLink } from "@/components/ui/button";
import { requireUser } from "@/modules/auth/service";
import { getLatestReport, trackReportViewed } from "@/modules/chat/service";
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
  // The learner can only ever see their own newest report: it is looked up by their user id, never by an id in the URL.
  const session = await requireUser("/discover/report");
  const result = await getLatestReport(session.userId);

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">We could not open your report</h1>
        <p className="mt-2 text-slate-600">Please refresh the page in a moment.</p>
        <HelplineLink className="mt-8 justify-center" />
      </div>
    );
  }

  if (!result.latest) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center" data-testid="report-empty">
        <h1 className="text-2xl font-bold text-ink">Your report is not ready yet</h1>
        <p className="mt-2 text-slate-600">Answer the quick questions and your report will appear here.</p>
        <ButtonLink href="/discover" className="mt-6">
          Start the questions
        </ButtonLink>
        <HelplineLink className="mt-8 justify-center" />
      </div>
    );
  }

  // The page fires the view event itself (the lookup has no side effects, so My SELF and callbacks do not inflate it).
  trackReportViewed(result.latest.attemptId, result.latest.report);
  const wording = await getConsentWording(session.userId);
  return (
    <ReportView report={result.latest.report}>
      {wording && <CallbackForm wording={wording} phoneMasked={session.phoneMasked} />}
    </ReportView>
  );
}
