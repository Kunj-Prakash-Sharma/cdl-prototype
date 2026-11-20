"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShieldCheck, Smartphone } from "lucide-react";
import { sendOtp, verifyOtp } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { authMessage } from "./messages";
import { useTurnstile } from "./use-turnstile";

type Step = "phone" | "code";

export function LoginForm({ next, siteKey }: { next: string; siteKey: string }) {
  const router = useRouter();
  const { container, getToken } = useTurnstile(siteKey);
  const [step, setStep] = useState<Step>("phone");
  const [digits, setDigits] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [pending, startTransition] = useTransition();
  const codeInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (step === "code") codeInput.current?.focus();
  }, [step]);

  function send() {
    setError(null);
    startTransition(async () => {
      const captchaToken = await getToken();
      if (!captchaToken) return setError(authMessage("captcha_failed"));
      const result = await sendOtp({ phone: `+91${digits}`, captchaToken });
      if (!result.ok) return setError(authMessage(result.code, result.retryAfterSec));
      setResendIn(result.resendAfterSec);
      setCode("");
      setStep("code");
    });
  }

  function verify(value: string) {
    setError(null);
    startTransition(async () => {
      const result = await verifyOtp({ phone: `+91${digits}`, code: value, next });
      if (!result.ok) {
        setCode("");
        codeInput.current?.focus();
        return setError(authMessage(result.code, result.retryAfterSec));
      }
      // Full navigation so the navbar and layout re-read the new session cookie.
      router.replace(result.next);
      router.refresh();
    });
  }

  const phoneReady = /^[6-9]\d{9}$/.test(digits);

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift ring-1 ring-slate-200/80 sm:p-8">
      {step === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (phoneReady && !pending) send();
          }}
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
            <Smartphone className="size-6" aria-hidden />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">Log in with your phone</h1>
          <p className="mt-2 text-slate-600">We will text you a 6-digit code. No password needed.</p>

          <label htmlFor="phone" className="mt-6 block text-sm font-semibold text-ink">
            Mobile number
          </label>
          <div className="mt-2 flex h-12 items-center rounded-2xl bg-white ring-1 ring-slate-300 focus-within:ring-2 focus-within:ring-brand-500">
            <span className="pr-2 pl-4 font-semibold text-slate-500">+91</span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              maxLength={10}
              value={digits}
              onChange={(e) => setDigits(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="h-full min-w-0 flex-1 rounded-r-2xl bg-transparent pr-4 text-lg tracking-wide text-ink outline-none"
              aria-describedby={error ? "login-error" : undefined}
            />
          </div>

          {error ? (
            <ErrorText>{error}</ErrorText>
          ) : (
            digits.length === 10 &&
            !phoneReady && (
              <ErrorText>Indian mobile numbers start with 6, 7, 8 or 9. Please check the number.</ErrorText>
            )
          )}

          <Button type="submit" size="lg" className="mt-6 w-full" disabled={!phoneReady || pending}>
            {pending ? "Sending…" : "Send code"}
          </Button>
        </form>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (code.length === 6 && !pending) verify(code);
          }}
        >
          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setError(null);
            }}
            className="-ml-2 inline-flex h-11 items-center gap-1.5 rounded-full px-2 text-sm font-semibold text-slate-600 hover:text-ink"
          >
            <ArrowLeft className="size-4" aria-hidden /> Change number
          </button>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink">Enter the code</h1>
          <p className="mt-2 text-slate-600">
            We sent a 6-digit code to <span className="font-semibold text-ink">+91 {digits}</span>.
          </p>

          <label htmlFor="code" className="sr-only">
            6-digit code
          </label>
          <input
            id="code"
            ref={codeInput}
            name="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="······"
            maxLength={6}
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(value);
              if (value.length === 6 && !pending) verify(value);
            }}
            className="mt-6 h-14 w-full rounded-2xl bg-white text-center text-2xl font-bold tracking-[0.5em] text-ink ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-brand-500"
            aria-describedby={error ? "login-error" : undefined}
          />

          {error && <ErrorText>{error}</ErrorText>}

          <Button type="submit" size="lg" className="mt-6 w-full" disabled={code.length !== 6 || pending}>
            {pending ? "Checking…" : "Verify and continue"}
          </Button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Did not get it?{" "}
            {resendIn > 0 ? (
              <span>Resend in {resendIn}s</span>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={pending}
                className="font-semibold text-brand-700 underline-offset-2 hover:underline disabled:opacity-50"
              >
                Send a new code
              </button>
            )}
          </p>
        </form>
      )}

      {/* Invisible bot check mounts here */}
      <div ref={container} />

      <p className="mt-6 flex items-center gap-2 text-xs text-slate-500">
        <ShieldCheck className="size-4 shrink-0 text-brand-600" aria-hidden />
        Your number is only used to log you in.
      </p>
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p id="login-error" role="alert" className="mt-3 text-sm font-medium text-red-600">
      {children}
    </p>
  );
}
