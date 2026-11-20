"use client";

import { Check, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConsentCheck, TimeSlots, useCallbackRequest, type CallbackWording } from "./callback-request";

// The callback request form on the report (E6-S1, E5-S5), in the V5 look. The request logic, the time slots and the
// consent tick are shared with Home's "Book a free call" (callback-request.tsx). The consent text comes from the server
// (D79: one wording, no minor flow). GAP (D92): the artboard names a coach ("Gaurav Sharma") and shows time ranges
// under each slot; both are client inputs, so the copy says "our team" and the slots have no range.

export function CallbackForm({ wording }: { wording: CallbackWording }) {
  const request = useCallbackRequest();

  return (
    <section
      id="callback"
      data-testid="callback"
      className="scroll-mt-44 rounded-[28px] border border-line bg-white p-6 shadow-lift sm:p-9 lg:p-11 print:hidden"
    >
      {request.done ? (
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

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void request.send();
            }}
            data-testid="callback-form"
          >
            <TimeSlots time={request.time} onToggle={request.toggleTime} look="cards" testIdPrefix="callback" />
            <ConsentCheck
              wording={wording}
              checked={request.consent}
              onChange={request.setConsent}
              testId="callback-consent"
            />
            {request.error && (
              <p role="alert" className="mt-3 text-sm font-medium text-sun-600" data-testid="callback-error">
                {request.error}
              </p>
            )}
            <Button
              type="submit"
              disabled={!request.consent || request.pending}
              data-testid="callback-submit"
              className="mt-4 w-full disabled:border-brand-200 disabled:bg-brand-200 disabled:opacity-100 sm:w-auto"
            >
              {request.pending ? "Sending…" : "Request a callback"}
            </Button>
          </form>
        </div>
      )}
    </section>
  );
}
