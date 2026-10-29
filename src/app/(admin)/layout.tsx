import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import { requireAdmin } from "@/modules/auth/service";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin" },
  robots: { index: false, follow: false },
};

// Reading the session is request-time work, so the guard sits inside Suspense (Cache Components).
// Children render only after the guard passes. Not-logged-in goes to /login, a learner goes home.
async function Guard({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin("/admin");
  return <AdminShell session={session}>{children}</AdminShell>;
}

// Admin pages get their own shell: no public navbar or footer. proxy.ts only checks that a cookie exists;
// the guard checks the session and the role. Any future server action under /admin needs its own requireAdmin().
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="min-h-screen flex-1 bg-paper" aria-busy="true" />}>
      <Guard>{children}</Guard>
    </Suspense>
  );
}
