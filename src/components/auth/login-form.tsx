"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowLeft, ShieldCheck, Smartphone } from "lucide-react";
import { sendOtp, verifyOtp } from "@/modules/auth/actions";
import { nationalDigits } from "@/modules/auth/phone";
import { Button } from "@/components/ui/button";
import { authMessage } from "./messages";
import { useTurnstile } from "./use-turnstile";

type Step = "phone" | "code";

/** Optional wording, for the phone gate in front of the report (D78). The login page uses the defaults. */
export type LoginCopy = { title: string; lead: string; footnote: string };

const LOGIN_COPY: LoginCopy = {
  title: "Log in with your phone",
  lead: "We will text you a 6-digit code. No password needed.",
  footnote: "Your number is only used to log you in.",
};

export function LoginForm({ next, siteKey, copy = LOGIN_COPY }: { next: string; siteKey: string; copy?: LoginCopy }) {
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
      // Full page load so the navbar and layout re-read the new session cookie. Not router.replace + refresh: the
      // refresh can re-render /login first, whose own redirect then shows the next page under the /login URL.
      // result.next is already a same-site path (safeNextPath on the server).
      window.location.replace(result.next);
    });
  }

  const phoneReady = /^[6-9]\d{9}$/.test(digits);

  const inputShell =
    "overflow-hidden rounded-[14px] border-[1.5px] border-line transition-colors focus-within:border-brand-600 focus-within:shadow-focus";
  const mainButton = "mt-5 w-full disabled:border-brand-200 disabled:bg-brand-200 disabled:opacity-100";
  const heading = (title: string, lead: React.ReactNode) => (
    <div className="text-center">
      <span className="inline-grid size-15 place-items-center rounded-[18px] bg-brand-100 text-brand-600">
        <Smartphone className="size-7" aria-hidden />
      </span>
      <h1 className="mt-5 mb-2 font-display text-[28px] leading-[1.15] font-normal tracking-[-1px] text-ink sm:text-[34px]">
        {title}
      </h1>
      <p className="mb-6 text-[15px] leading-[1.55] text-muted">{lead}</p>
    </div>
  );

  return (
    <div className="w-full max-w-[460px] rounded-[28px] border border-line bg-white p-7 shadow-glow sm:p-11">
      {step === "phone" ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (phoneReady && !pending) send();
          }}
        >
          {heading(copy.title, copy.lead)}

          <label htmlFor="phone" className="mb-1.5 block text-sm font-bold text-ink">
            Mobile number
          </label>
          {/* V5: the number field is white on the card; the code field below keeps the paper fill. */}
          <div className={`flex items-center ${inputShell} bg-white`}>
            <span className="pr-1 pl-4 font-bold text-body">+91</span>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="98765 43210"
              value={digits}
              onChange={(e) => setDigits(nationalDigits(e.target.value))}
              className="autofill-white min-h-12 min-w-0 flex-1 bg-transparent py-3 pr-4 pl-2 text-[15px] text-ink outline-none"
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

          <Button type="submit" className={mainButton} disabled={!phoneReady || pending}>
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
          {heading(
            "Enter the code",
            <>
              We sent a 6-digit code to <span className="font-bold text-ink">+91 {digits}</span>.
            </>,
          )}

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
            placeholder="000000"
            value={code}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "").slice(0, 6);
              setCode(value);
              if (value.length === 6 && !pending) verify(value);
            }}
            className={`autofill-paper min-h-14 w-full text-center text-[22px] font-bold tracking-[0.4em] text-ink outline-none focus:border-brand-600 focus:shadow-focus ${inputShell} bg-paper`}
            aria-describedby={error ? "login-error" : undefined}
          />

          {error && <ErrorText>{error}</ErrorText>}

          <Button type="submit" className={mainButton} disabled={code.length !== 6 || pending}>
            {pending ? "Checking…" : "Verify and log in"}
          </Button>

          <button
            type="button"
            onClick={() => {
              setStep("phone");
              setError(null);
            }}
            className="mt-1.5 inline-flex min-h-11 w-full items-center justify-center gap-1.5 text-sm font-semibold text-brand-600 hover:text-brand-800"
          >
            <ArrowLeft className="size-4" aria-hidden /> Use a different number
          </button>

          <p className="mt-1 text-center text-sm text-muted">
            Did not get it?{" "}
            {resendIn > 0 ? (
              <span>Resend in {resendIn}s</span>
            ) : (
              <button
                type="button"
                onClick={send}
                disabled={pending}
                className="inline-flex min-h-11 items-center font-semibold text-brand-600 hover:text-brand-800 disabled:opacity-50"
              >
                Send a new code
              </button>
            )}
          </p>
        </form>
      )}

      {/* Invisible bot check mounts here */}
      <div ref={container} />

      <p className="mt-5 flex items-center justify-center gap-2 text-[13px] text-muted">
        <ShieldCheck className="size-4 shrink-0 text-brand-600" aria-hidden />
        {copy.footnote}
      </p>
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p id="login-error" role="alert" className="mt-3 text-sm font-semibold text-danger">
      {children}
    </p>
  );
}
