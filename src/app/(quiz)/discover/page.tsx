import { Suspense } from "react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ChatFlow } from "@/components/discover/chat-flow";
import { HelplineLink } from "@/components/discover/helpline-link";
import { redirect } from "next/navigation";
import { GuestStart } from "@/components/discover/guest-start";
import { env } from "@/lib/env";
import { getVisitor } from "@/modules/auth/service";
import { getLatestResult, getResumeOffer, hasOpenAttempt, startOrResumeAttempt } from "@/modules/chat/service";

export const metadata: Metadata = {
  title: `Chat with ${brand.guideName}`,
  description: `Answer a few quick questions and get your personal career report with ${brand.guideName}.`,
};

// Reading the session and the database is request-time work, so it sits in its own Suspense boundary (Cache
// Components: next dev reports "blocking-prerender-dynamic" when a page does this outside one). Anyone can take the
// quiz (D78): a verified learner, or a guest. A visitor with no session sees the Start screen, which makes the guest.
export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <Discover />
    </Suspense>
  );
}

async function Discover() {
  const visitor = await getVisitor();
  if (!visitor) {
    // REPORT_GATE=before_chat keeps the old rule: log in first.
    if (env.REPORT_GATE === "before_chat") redirect("/login?next=%2Fdiscover");
    return (
      <GuestStart
        siteKey={env.TURNSTILE_SITE_KEY ?? "1x00000000000000000000BB"}
        title={`Chat with ${brand.guideName}`}
        lead="A few quick questions, then your personal career report."
        button="Start"
      />
    );
  }
  const learner = { userId: visitor.userId, name: visitor.name };

  // A learner who finished and has nothing open sees the saved result (with a retake button), not a new empty attempt.
  const latest = await getLatestResult(learner.userId);
  if (latest && !(await hasOpenAttempt(learner.userId))) {
    return (
      <ChatFlow
        key={latest.attemptId}
        attemptId={latest.attemptId}
        initial={{ kind: "done", progress: { answered: 0, total: 0, stages: [], finishLabel: "" } }}
        finished={latest}
      />
    );
  }

  // A returning learner with an unfinished quiz is asked "Continue or start again" (E4-S12, D75).
  const offer = await getResumeOffer(learner);
  const started = await startOrResumeAttempt(learner);
  if (!started.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">We could not open the chat</h1>
        <p className="mt-2 text-muted">Please refresh the page in a moment.</p>
        <HelplineLink className="mt-8 justify-center" />
      </div>
    );
  }
  return (
    <ChatFlow
      key={started.attemptId}
      attemptId={started.attemptId}
      initial={started.next}
      resume={offer.kind === "offer" ? { answered: offer.answered, total: offer.total } : undefined}
    />
  );
}
