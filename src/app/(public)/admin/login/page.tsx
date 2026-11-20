import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AdminLoginForm } from "@/components/auth/admin-login-form";
import { env } from "@/lib/env";
import { safeNextPath } from "@/modules/auth/next-path";
import { getSession } from "@/modules/auth/service";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false, follow: false },
};

// Where an admin lands when there is no (safe) `?next=`.
const AFTER_ADMIN_LOGIN = "/admin/callbacks";

// Reading searchParams and the session are request-time work, so they sit inside Suspense (Cache Components).
async function Gate({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next: rawNext } = await searchParams;
  const next = safeNextPath(Array.isArray(rawNext) ? rawNext[0] : rawNext, AFTER_ADMIN_LOGIN);
  const session = await getSession();
  if (session?.role === "admin") redirect(next);
  // Dev falls back to Cloudflare's public test key (always passes). Production requires real keys (env schema).
  return <AdminLoginForm next={next} siteKey={env.TURNSTILE_SITE_KEY ?? "1x00000000000000000000BB"} />;
}

export default function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-7xl items-start justify-center px-4 py-10 sm:items-center sm:px-6 sm:py-16">
      <Suspense
        fallback={<div className="h-96 w-full max-w-md rounded-3xl bg-white shadow-soft ring-1 ring-slate-200/80" />}
      >
        <Gate searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
