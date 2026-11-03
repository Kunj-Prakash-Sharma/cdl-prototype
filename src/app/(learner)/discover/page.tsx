import { Suspense } from "react";
import type { Metadata } from "next";
import { brand } from "@/config/brand";
import { ChatFlow } from "@/components/discover/chat-flow";
import { HelplineLink } from "@/components/discover/helpline-link";
import { requireUser } from "@/modules/auth/service";
import { getLatestResult, hasOpenAttempt, startOrResumeAttempt } from "@/modules/chat/service";

export const metadata: Metadata = {
  title: `Chat with ${brand.guideName}`,
  description: `Answer a few quick questions and get your personal career report with ${brand.guideName}.`,
};

// Reading the session and the database is request-time work, so it sits in its own Suspense boundary (Cache
// Components: next dev reports "blocking-prerender-dynamic" when a page does this outside one). The learner layout has
// already called requireUser(); the call in `Discover` is cheap and gives us the learner's id and name.
export default function DiscoverPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
      <Discover />
    </Suspense>
  );
}

async function Discover() {
  const session = await requireUser("/discover");
  const learner = { userId: session.userId, name: session.name };

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

  const started = await startOrResumeAttempt(learner);
  if (!started.ok) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-ink">We could not open the chat</h1>
        <p className="mt-2 text-slate-600">Please refresh the page in a moment.</p>
        <HelplineLink className="mt-8 justify-center" />
      </div>
    );
  }
  return <ChatFlow key={started.attemptId} attemptId={started.attemptId} initial={started.next} />;
}
