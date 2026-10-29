import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { env } from "@/lib/env";
import { safeNextPath } from "@/modules/auth/next-path";
import { getSession } from "@/modules/auth/service";

export const metadata: Metadata = {
  title: "Log in",
};

// Reading searchParams and the session are request-time work, so they sit inside Suspense (Cache Components).
async function LoginGate({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext);
  if (await getSession()) redirect(next);
  // Dev falls back to Cloudflare's public test key (always passes). Production requires real keys (env schema).
  return <LoginForm next={next} siteKey={env.TURNSTILE_SITE_KEY ?? "1x00000000000000000000BB"} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-7xl items-start justify-center px-4 py-10 sm:items-center sm:px-6 sm:py-16">
      <Suspense
        fallback={<div className="h-96 w-full max-w-md rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80" />}
      >
        <LoginGate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
