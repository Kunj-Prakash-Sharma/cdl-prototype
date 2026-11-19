import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { env } from "@/lib/env";
import { getSession, safeNextPath } from "@/modules/auth/service";

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
    <div className="hero-glow flex min-h-[70vh] items-center justify-center px-[18px] py-9 sm:px-6 sm:py-16 lg:py-20">
      <Suspense
        fallback={<div className="h-96 w-full max-w-[460px] rounded-[28px] border border-line bg-white shadow-glow" />}
      >
        <LoginGate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
