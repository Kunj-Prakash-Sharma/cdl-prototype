"use client";

import { useState } from "react";
import { Check, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/format";
import { requestCallback } from "@/modules/leads/actions";

// The callback request form on the report (E6-S1, E5-S5), in the V5 look. The logic (consent first, one request per
// learner, a message per error code) is unchanged. The consent text comes from the server (D79: one wording, no minor
// flow). GAP (D82): the artboard names a coach ("Gaurav Sharma") and shows time ranges under each slot; both are client
// inputs, so the copy says "our team" and the slots have no range.

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

export function CallbackForm({ wording }: { wording: CallbackWording }) {
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
      className="scroll-mt-44 rounded-[28px] border border-line bg-white p-6 shadow-lift sm:p-9 lg:p-11 print:hidden"
    >
      {done ? (
        <div className="flex items-start gap-4 sm:gap-5" data-testid="callback-done" role="status">
          <span className="grid size-13 flex-none place-items-center rounded-full bg-brand-600 text-white shadow-[0_0_0_8px_var(--color-brand-100)]">
            <Check className="size-6" strokeWidth={2.4} aria-hidden />
          </span>
          <div>
            <h2 className="font-display text-[22px] leading-[1.2] font-normal tracking-[-0.5px] text-ink sm:text-[28px]">
              Request received.
            </h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-body">
              Thank you. We have your request and will call you on the mobile number you verified.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
          <div>
            <span
              className="grid size-12 place-items-center rounded-full bg-brand-100 text-brand-600"
              aria-hidden="true"
            >
              <Phone className="size-5" />
            </span>
            <h2 className="mt-3.5 font-display text-[22px] leading-[1.2] font-normal tracking-[-0.5px] text-ink sm:text-[28px]">
              Talk to <span className="text-brand-600">our team</span>
            </h2>
            <p className="mt-2 text-[15px] leading-[1.6] text-body">
              A short call to talk about your report and the courses, on the mobile number you verified.
            </p>
          </div>

          <form onSubmit={submit} data-testid="callback-form">
            <fieldset>
              <legend className="mb-2.5 text-[15px] font-bold text-ink">
                Best time to call <span className="font-medium text-muted">(optional)</span>
              </legend>
              <div className="grid gap-2.5 sm:grid-cols-3">
                {TIMES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={time === option.value}
                    onClick={() => setTime(time === option.value ? null : option.value)}
                    data-testid={`callback-time-${option.value}`}
                    className={cn(
                      "min-h-12 rounded-2xl border-[1.5px] px-3.5 py-3 text-left text-[15px] font-bold transition-colors",
                      time === option.value
                        ? "border-brand-600 bg-brand-600 text-white"
                        : "border-line bg-white text-ink hover:border-brand-300",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </fieldset>

            <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-[1.55] text-body">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                data-testid="callback-consent"
                className="mt-0.5 size-5 shrink-0 accent-brand-600"
              />
              <span>
                {wording.text}
                {wording.draft && (
                  <span className="ml-2 rounded-full bg-sun-100 px-2 py-0.5 text-[11px] font-semibold text-sun-700">
                    Draft wording
                  </span>
                )}
              </span>
            </label>

            {error && (
              <p role="alert" className="mt-3 text-sm font-medium text-sun-600" data-testid="callback-error">
                {error}
              </p>
            )}
            <Button
              type="submit"
              disabled={!consent || pending}
              data-testid="callback-submit"
              className="mt-4 w-full disabled:border-brand-200 disabled:bg-brand-200 disabled:opacity-100 sm:w-auto"
            >
              {pending ? "Sending…" : "Request a callback"}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
