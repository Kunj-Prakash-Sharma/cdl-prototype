"use client";

import { LogOut } from "lucide-react";
import { useLogout } from "@/components/site/user-menu";

export function LogoutButton() {
  const { run, pending } = useLogout();
  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      aria-label="Log out"
      className="grid size-11 shrink-0 place-items-center rounded-full text-slate-600 transition-colors hover:bg-slate-900/5 hover:text-ink disabled:opacity-50"
    >
      <LogOut className="size-[18px]" aria-hidden />
    </button>
  );
}
