"use client";

import { useState } from "react";
import { cn } from "@/lib/format";
import { requestCallback } from "@/modules/leads/actions";

// What the two callback forms share (the report's "Talk to our team", E6-S1; Home's "Book a free call", D90): the
// request itself (consent first, one request per learner, a message per error code), the best-time slots and the
// consent tick with its server wording (D79). Each form keeps only its own layout.

export type CallbackTime = "morning" | "afternoon" | "evening";
export const CALLBACK_TIMES: { value: CallbackTime; label: string }[] = [
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

/** The learner-facing message for a callback error code. */
export const callbackMessage = (code: string) => MESSAGES[code] ?? FALLBACK_MESSAGE;

/** The state of one callback request. `source` says where it was asked from (the server fixes the login return path). */
export function useCallbackRequest(source?: "home") {
  const [consent, setConsent] = useState(false);
  const [time, setTime] = useState<CallbackTime | null>(null);
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const result = await requestCallback({ consent, preferredTime: time, ...(source ? { source } : {}) });
      // A repeat tap comes back ok too (the server keeps one request), so the learner sees the same confirmation.
      if (result.ok) setDone(true);
      else setError(callbackMessage(result.code));
    } catch {
      setError(FALLBACK_MESSAGE);
    } finally {
      setPending(false);
    }
  }

  return {
    consent,
    setConsent,
    time,
    /** A second tap on the chosen slot clears it (the time is optional). */
    toggleTime: (value: CallbackTime) => setTime((current) => (current === value ? null : value)),
    pending,
    done,
    error,
    clearError: () => setError(null),
    send,
  };
}

/** The optional best-time slots: wide cards on the report, pills on Home. */
export function TimeSlots({
  time,
  onToggle,
  look,
  testIdPrefix,
}: {
  time: CallbackTime | null;
  onToggle: (value: CallbackTime) => void;
  look: "cards" | "pills";
  testIdPrefix: string;
}) {
  return (
    <fieldset>
      <legend className={cn("text-ink", look === "cards" ? "mb-2.5 text-[15px] font-bold" : "mb-2 text-sm font-bold")}>
        Best time to call <span className="font-medium text-muted">(optional)</span>
      </legend>
      <div className={look === "cards" ? "grid gap-2.5 sm:grid-cols-3" : "flex flex-wrap gap-2"}>
        {CALLBACK_TIMES.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={time === option.value}
            onClick={() => onToggle(option.value)}
            data-testid={`${testIdPrefix}-time-${option.value}`}
            className={cn(
              "border-[1.5px] font-bold transition-colors",
              look === "cards"
                ? "min-h-12 rounded-2xl px-3.5 py-3 text-left text-[15px]"
                : "min-h-[46px] rounded-full px-4 text-sm",
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
  );
}

/** The consent tick, with the wording the server picked and its draft tag. */
export function ConsentCheck({
  wording,
  checked,
  onChange,
  testId,
}: {
  wording: CallbackWording;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testId: string;
}) {
  return (
    <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-[1.55] text-body">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        data-testid={testId}
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
  );
}
