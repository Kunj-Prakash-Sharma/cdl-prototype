"use client";

import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  ConsentCheck,
  TimeSlots,
  useCallbackRequest,
  type CallbackWording,
} from "@/components/report/callback-request";

// "Book a free call" on the Home coach card (V5-Home, D90). A logged-in learner opens a short form under the button:
// best time (optional), the consent tick, Request a call / Cancel; no finished report needed (source "home").
// Not logged in: the button goes to login and back to Home (the return path is fixed on the server too).
// The request logic, slots and consent tick are shared with the report's form (callback-request.tsx).
// GAP against the artboard: it has a typed mobile number. We call the number the learner verified at login (D90),
// so the form shows that number masked instead of an input. The coach's name in the confirmation is sample content,
// so the confirmation says "we".

export const HOME_LOGIN_HREF = "/login?next=%2F";

/**
 * Shown until the session part of Home streams in: the button is there but does nothing yet, so a logged-in learner
 * who taps early is not sent to login and back.
 */
export function CoachCallbackPlaceholder() {
  return (
    <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5" aria-busy="true">
      <Button size="lg" className="max-md:w-full" disabled data-testid="coach-book-waiting">
        Book a free call <ArrowRight className="size-4" aria-hidden />
      </Button>
    </div>
  );
}

export function CoachCallback({ wording, phone }: { wording: CallbackWording | null; phone: string | null }) {
  if (!wording) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <ButtonLink href={HOME_LOGIN_HREF} size="lg" className="max-md:w-full" data-testid="coach-book">
          Book a free call <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
        <span className="text-[13px] text-muted">Log in with your mobile number to book</span>
      </div>
    );
  }
  return <CoachCallbackForm wording={wording} phone={phone} />;
}

function CoachCallbackForm({ wording, phone }: { wording: CallbackWording; phone: string | null }) {
  const [open, setOpen] = useState(false);
  const request = useCallbackRequest("home");

  if (request.done) {
    return (
      <div
        className="mt-5.5 flex items-center gap-3.5 rounded-[18px] bg-brand-50 px-4.5 py-4"
        role="status"
        data-testid="coach-done"
      >
        <span aria-hidden className="grid size-9 flex-none place-items-center rounded-full bg-brand-600 text-white">
          <Check className="size-5" strokeWidth={2.6} />
        </span>
        <p className="text-[15px] text-ink">
          <b>Request received.</b> We will call you on {phone ?? "the number you verified"}
          {request.time ? ` in the ${request.time}` : ""}.
        </p>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2.5">
        <Button size="lg" className="max-md:w-full" onClick={() => setOpen(true)} data-testid="coach-book">
          Book a free call <ArrowRight className="size-4" aria-hidden />
        </Button>
        <span className="text-[13px] text-muted">Takes under a minute to book</span>
      </div>
    );
  }

  return (
    <form
      className="mt-5.5 border-t border-mist pt-5.5"
      data-testid="coach-form"
      onSubmit={(e) => {
        e.preventDefault();
        void request.send();
      }}
    >
      <div className="grid gap-4">
        {phone && (
          <p className="text-sm text-body">
            <span className="mb-2 block text-sm font-bold text-ink">Mobile number</span>
            We will call <b className="font-bold text-ink">{phone}</b>, the number you verified.
          </p>
        )}
        <TimeSlots time={request.time} onToggle={request.toggleTime} look="pills" testIdPrefix="coach" />
      </div>
      <ConsentCheck wording={wording} checked={request.consent} onChange={request.setConsent} testId="coach-consent" />
      {request.error && (
        <p role="alert" className="mt-2 text-[13px] text-danger" data-testid="coach-error">
          {request.error}
        </p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button
          type="submit"
          disabled={!request.consent || request.pending}
          data-testid="coach-submit"
          className="disabled:border-brand-200 disabled:bg-brand-200 disabled:opacity-100 max-sm:w-full"
        >
          {request.pending ? "Sending…" : "Request a call"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            request.clearError();
          }}
          className="min-h-11 px-1 text-[15px] font-bold text-muted hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
