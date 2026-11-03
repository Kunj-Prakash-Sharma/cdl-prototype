"use client";

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";
import { SageAvatar } from "@/components/ui/misc";
import type { ResultView } from "@/modules/chat/result";
import { HelplineLink } from "./helpline-link";

/** Shown while the answers are scored (the prototype's pulsing avatar). */
export function FinishingScreen({
  error,
  pending,
  onRetry,
}: {
  error?: string | null;
  pending?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center py-16 text-center" data-testid="finishing" aria-live="polite">
      <div className="relative grid size-40 place-items-center">
        <span className="absolute inset-6 animate-pulse-ring rounded-full bg-brand-400/40" />
        <span className="absolute inset-6 animate-pulse-ring rounded-full bg-fuchsia-400/30 [animation-delay:0.7s]" />
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="absolute inset-2 rounded-full border-2 border-dashed border-brand-200"
        />
        <SageAvatar size="lg" className="relative scale-125" />
      </div>
      <h1 className="mt-8 text-3xl font-extrabold tracking-tight text-ink">Putting your answers together…</h1>
      <p className="mt-2 text-slate-600">{brand.guideName} will have your result in a moment.</p>
      {error && (
        <>
          <p role="alert" className="mt-4 text-sm font-medium text-red-600">
            {error}
          </p>
          {onRetry && (
            <Button className="mt-4" onClick={onRetry} disabled={pending} data-testid="finish-retry">
              Try again
            </Button>
          )}
        </>
      )}
    </div>
  );
}

/** All answers of one part were the same: ask that part again (the server clears only that part). */
export function RetryScreen({
  pending,
  error,
  onRetry,
}: {
  pending: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div
      className="rounded-3xl bg-white p-8 text-center shadow-soft ring-1 ring-slate-200/80 sm:p-12"
      data-testid="retry"
    >
      <h1 className="text-2xl font-bold text-ink">Your answers were all the same</h1>
      <p className="mx-auto mt-2 max-w-md text-slate-600">
        Want to try that part again? There are no right or wrong answers.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="mt-8 flex justify-center">
        <Button onClick={onRetry} disabled={pending} data-testid="retry-button">
          Try that part again
        </Button>
      </div>
    </div>
  );
}

/** The name was a self-harm phrase (decision D70): the quiz stops, the helpline is shown, nothing was saved. */
export function StopScreen({
  pending,
  error,
  onRestart,
}: {
  pending: boolean;
  error: string | null;
  onRestart: () => void;
}) {
  return (
    <div className="space-y-6 text-center" data-testid="stop-screen">
      <div className="rounded-3xl bg-white p-8 shadow-soft ring-1 ring-slate-200/80 sm:p-12">
        <h1 className="text-2xl font-bold text-ink">Let&apos;s pause here</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          If you are going through a hard time, please talk to someone you trust or to a helpline. You do not have to
          handle it alone.
        </p>
        <HelplineLink large className="mt-6" />
        {error && (
          <p role="alert" className="mt-4 text-sm font-medium text-red-600">
            {error}
          </p>
        )}
        <div className="mt-8 flex justify-center">
          <Button variant="secondary" onClick={onRestart} disabled={pending} data-testid="restart-button">
            Start again
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Everything in a result except its bookkeeping fields, so this file never names the parts of the quiz. */
const BOOKKEEPING = new Set(["attemptId", "setVersion", "completedAt"]);
function scoresOf(result: ResultView) {
  return Object.fromEntries(Object.entries(result).filter(([key]) => !BOOKKEEPING.has(key)));
}

/**
 * TEMPORARY: the real report is built later (docs/specs/chat.md, 4d). Until then this confirms the answers are saved and
 * shows the stored result as plain data so the scoring can be checked by hand.
 */
export function ResultPlaceholder({
  result,
  pending,
  error,
  onRetake,
}: {
  result: ResultView;
  pending: boolean;
  error: string | null;
  onRetake: () => void;
}) {
  return (
    <div
      className="rounded-3xl bg-white p-8 text-center shadow-soft ring-1 ring-slate-200/80 sm:p-12"
      data-testid="result"
    >
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50">
        <Check className="size-8 text-emerald-500" strokeWidth={2.5} aria-hidden />
      </div>
      <h1 className="mt-5 text-2xl font-bold text-ink">Your answers are saved</h1>
      <p className="mx-auto mt-2 max-w-md text-slate-600">Your report is being built and will appear here soon.</p>
      <details className="mx-auto mt-6 max-w-md text-left text-sm text-slate-500">
        <summary className="cursor-pointer font-semibold">Stored result (temporary, for testing)</summary>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-slate-50 p-3 text-xs" data-testid="result-json">
          {JSON.stringify(scoresOf(result), null, 2)}
        </pre>
      </details>
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <div className="mt-8 flex justify-center">
        <Button variant="secondary" onClick={onRetake} disabled={pending} data-testid="retake-button">
          Take it again
        </Button>
      </div>
    </div>
  );
}
