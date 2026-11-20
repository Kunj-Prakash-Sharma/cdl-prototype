"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { startGuestSession } from "@/modules/auth/actions";
import { authMessage } from "@/components/auth/messages";
import { useTurnstile } from "@/components/auth/use-turnstile";
import { Button } from "@/components/ui/button";

// The first screen for a visitor with no session (D78). A guest session is made only when they tap Start (behind the
// bot check), never on page load. TEMPORARY layout until the new design lands; wording comes from the props.
export function GuestStart({
  siteKey,
  title,
  lead,
  button,
}: {
  siteKey: string;
  title: string;
  lead: string;
  button: string;
}) {
  const router = useRouter();
  const { container, getToken } = useTurnstile(siteKey);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function start() {
    setError(null);
    startTransition(async () => {
      const captchaToken = await getToken();
      if (!captchaToken) return setError(authMessage("captcha_failed"));
      const result = await startGuestSession({ captchaToken });
      if (!result.ok) return setError(authMessage(result.code, result.retryAfterSec));
      router.refresh(); // the page now sees the guest and opens the chat
    });
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center" data-testid="guest-start">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-3 text-slate-600">{lead}</p>
      {error && (
        <p role="alert" className="mt-4 text-sm font-medium text-red-600">
          {error}
        </p>
      )}
      <Button size="lg" className="mt-8" onClick={start} disabled={pending}>
        {pending ? "Starting…" : button}
      </Button>
      <div ref={container} />
    </div>
  );
}
