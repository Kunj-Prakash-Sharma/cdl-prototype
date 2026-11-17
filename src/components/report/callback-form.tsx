"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/format";
import { requestCallback } from "@/modules/leads/actions";

// The callback request form on the report (E6-S1, E5-S5). TEMPORARY layout; the logic (consent first, one request per
// learner, a message per error code) stays when the design changes. The consent text comes from the server (D79: one
// wording, no minor flow).

type Time = "morning" | "afternoon" | "evening";
const TIMES: { value: Time; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

export type CallbackWording = { text: string; version: string; draft: boolean };

const MESSAGES: Record<string, string> = {
  consent_required: "Please tick the box so we know it is fine to call.",
  rate_limited: "You have asked a few times already. Please try again later.",
  no_report: "Please finish your report first.",
  no_phone: "We do not have a phone number for your account.",
};
const FALLBACK_MESSAGE = "Something went wrong. Please try again.";

export function CallbackForm({ wording, phoneMasked }: { wording: CallbackWording; phoneMasked: string }) {
  const [consent, setConsent] = useState(false);
  const [time, setTime] = useState<Time | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await requestCallback({ consent, preferredTime: time });
      // A repeat tap comes back ok too (the server keeps one request), so the learner sees the same confirmation.
      if (result.ok) setDone(true);
      else setError(MESSAGES[result.code] ?? FALLBACK_MESSAGE);
    } catch {
      setError(FALLBACK_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  return (
    <section
      id="callback"
      data-testid="callback"
      className="scroll-mt-24 break-inside-avoid rounded-3xl bg-white p-6 shadow-soft ring-1 ring-slate-200/80 sm:p-8 print:hidden"
    >
      <h2 className="text-xl font-bold text-ink">Talk to our team</h2>
      {done ? (
        <div
          className="mt-4 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4"
          data-testid="callback-done"
          role="status"
        >
          <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" strokeWidth={2.5} aria-hidden />
          <p className="text-sm text-slate-700">
            Thank you. We have your request and will call you on <span className="font-semibold">{phoneMasked}</span>.
          </p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-5" data-testid="callback-form">
          <p className="text-sm text-slate-600">
            A short call to talk about your report and the courses. We will call{" "}
            <span className="font-semibold text-ink">{phoneMasked}</span>.
          </p>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">Best time to call (optional)</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {TIMES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={time === option.value}
                  onClick={() => setTime(time === option.value ? null : option.value)}
                  data-testid={`callback-time-${option.value}`}
                  className={cn(
                    "min-h-11 rounded-full px-4 text-sm font-semibold ring-1 transition-colors",
                    time === option.value
                      ? "bg-brand-600 text-white ring-brand-600"
                      : "bg-white text-slate-700 ring-slate-200 hover:ring-slate-300",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex min-h-11 cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              data-testid="callback-consent"
              className="mt-0.5 size-5 shrink-0 accent-brand-600"
            />
            <span className="text-sm text-slate-700">
              {wording.text}
              {wording.draft && (
                <span className="ml-2 rounded-full bg-sun-100 px-2 py-0.5 text-[11px] font-semibold text-sun-700">
                  Draft wording
                </span>
              )}
            </span>
          </label>

          {error && (
            <p role="alert" className="text-sm font-medium text-red-600" data-testid="callback-error">
              {error}
            </p>
          )}
          <Button type="submit" disabled={!consent || pending} data-testid="callback-submit">
            {pending ? "Sending…" : "Request a callback"}
          </Button>
        </form>
      )}
    </section>
  );
}
