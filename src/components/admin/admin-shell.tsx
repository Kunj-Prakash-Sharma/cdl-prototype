import Link from "next/link";
import { ArrowLeft, Menu } from "lucide-react";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/admin/logout-button";
import { Logo } from "@/components/ui/misc";
import type { SessionView } from "@/modules/auth/types";

function Account({ session }: { session: SessionView }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-paper p-3 ring-1 ring-slate-200">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700"
        aria-hidden
      >
        {(session.name || "A").charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-ink">{session.name || session.phoneMasked}</p>
        <p className="text-xs text-slate-600">Administrator</p>
      </div>
      <LogoutButton />
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/"
      className="flex min-h-11 items-center gap-2 rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-900/[0.04] hover:text-ink"
    >
      <ArrowLeft className="size-4" aria-hidden /> Back to the learner site
    </Link>
  );
}

// The admin frame: a fixed sidebar on desktop, a compact top bar with a menu on phones.
// It replaces the public navbar and footer (see src/app/(admin)/layout.tsx).
export function AdminShell({ session, children }: { session: SessionView; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-1 flex-col bg-paper text-ink lg:flex-row">
      <aside className="hidden w-64 shrink-0 flex-col gap-7 border-r border-slate-200 bg-white p-4 lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="flex items-center justify-between px-2">
          <Logo />
          <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">Admin</span>
        </div>
        <AdminNav />
        <div className="mt-auto flex flex-col gap-3">
          <BackLink />
          <Account session={session} />
        </div>
      </aside>

      <header className="border-b border-slate-200 bg-white lg:hidden">
        <details className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-3">
              <Logo />
              <span className="rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-700">Admin</span>
            </span>
            <span className="grid size-11 place-items-center rounded-full text-ink group-open:bg-slate-900/5">
              <Menu className="size-5" aria-hidden />
              <span className="sr-only">Menu</span>
            </span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-slate-200 p-4">
            <AdminNav />
            <BackLink />
            <Account session={session} />
          </div>
        </details>
      </header>

      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-8">{children}</main>
    </div>
  );
}
