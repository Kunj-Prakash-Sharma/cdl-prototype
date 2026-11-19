"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { LogOut, ShieldCheck, UserRound } from "lucide-react";
import { logout } from "@/modules/auth/actions";
import type { SessionView } from "@/modules/auth/types";

/**
 * Logs out, then does a full page load of the home page so the layout re-reads the (now missing) session cookie.
 * Not router.replace + refresh: the refresh can re-render the current page first and leave the URL behind.
 */
export function useLogout() {
  const [pending, startTransition] = useTransition();
  const run = () =>
    startTransition(async () => {
      await logout();
      window.location.replace("/");
    });
  return { run, pending };
}

export function UserMenu({ session }: { session: SessionView }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const { run, pending } = useLogout();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="grid size-11 place-items-center rounded-full bg-brand-100 text-brand-700 hover:bg-brand-200"
      >
        <UserRound className="size-5" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-white p-2 shadow-glow">
          <div className="px-3 py-2">
            <p className="text-xs font-semibold tracking-wide text-muted uppercase">Logged in as</p>
            <p className="mt-0.5 font-semibold text-ink">{session.name || session.phoneMasked}</p>
            {session.name && <p className="text-sm text-muted">{session.phoneMasked}</p>}
            {session.role === "admin" && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-sun-100 px-2 py-0.5 text-xs font-semibold text-sun-700">
                <ShieldCheck className="size-3.5" aria-hidden /> Admin
              </span>
            )}
          </div>
          <div className="my-1 h-px bg-line" />
          <Link
            role="menuitem"
            href="/my-self"
            onClick={() => setOpen(false)}
            className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-mist"
          >
            My Learning
          </Link>
          {session.role === "admin" && (
            <Link
              role="menuitem"
              href="/admin"
              onClick={() => setOpen(false)}
              className="flex h-11 items-center rounded-xl px-3 text-sm font-medium text-ink hover:bg-mist"
            >
              Admin
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={run}
            disabled={pending}
            className="flex h-11 w-full items-center gap-2 rounded-xl px-3 text-sm font-medium text-ink hover:bg-mist disabled:opacity-50"
          >
            <LogOut className="size-4" aria-hidden /> {pending ? "Logging out…" : "Log out"}
          </button>
        </div>
      )}
    </div>
  );
}
