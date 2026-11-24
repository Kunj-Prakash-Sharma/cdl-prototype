"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { adminSignIn } from "@/modules/auth/actions";
import { Button } from "@/components/ui/button";
import { adminAuthMessage } from "./messages";
import { useTurnstile } from "./use-turnstile";

/** Email + password login for the client team (D77). Phone-OTP admins use the link at the bottom. */
export function AdminLoginForm({ next, siteKey }: { next: string; siteKey: string }) {
  const { container, getToken } = useTurnstile(siteKey);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const captchaToken = await getToken();
      if (!captchaToken) return setError(adminAuthMessage("captcha_failed"));
      const result = await adminSignIn({ email, password, captchaToken, next });
      if (!result.ok) {
        setPassword("");
        return setError(adminAuthMessage(result.code, result.retryAfterSec));
      }
      // Full page load so the admin shell re-reads the new session cookie (router.replace + refresh can race and
      // leave the URL on /admin/login). result.next is already a same-site path (safeNextPath on the server).
      window.location.replace(result.next);
    });
  }

  const ready = email.includes("@") && password.length > 0;
  const phoneHref = `/login?next=${encodeURIComponent(next)}`;

  return (
    <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lift ring-1 ring-line sm:p-8">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && !pending) submit();
        }}
      >
        <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-700">
          <ShieldCheck className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold tracking-tight text-ink">Admin login</h1>
        <p className="mt-2 text-muted">For the team that manages the site.</p>

        <label htmlFor="admin-email" className="mt-6 block text-sm font-semibold text-ink">
          Email
        </label>
        <input
          id="admin-email"
          name="email"
          type="email"
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-ink ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500"
          aria-describedby={error ? "admin-login-error" : undefined}
        />

        <label htmlFor="admin-password" className="mt-4 block text-sm font-semibold text-ink">
          Password
        </label>
        <input
          id="admin-password"
          name="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-2 h-12 w-full rounded-2xl bg-white px-4 text-ink ring-1 ring-line-strong outline-none focus:ring-2 focus:ring-brand-500"
          aria-describedby={error ? "admin-login-error" : undefined}
        />

        {error && (
          <p id="admin-login-error" role="alert" className="mt-3 text-sm font-medium text-sun-600">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="mt-6 w-full" disabled={!ready || pending}>
          {pending ? "Checking…" : "Log in"}
        </Button>
      </form>

      {/* Invisible bot check mounts here */}
      <div ref={container} />

      <p className="mt-6 text-center text-sm text-muted">
        Log in with a phone number instead?{" "}
        <Link href={phoneHref} className="font-semibold text-brand-700 underline-offset-2 hover:underline">
          Use a code
        </Link>
      </p>
    </div>
  );
}
