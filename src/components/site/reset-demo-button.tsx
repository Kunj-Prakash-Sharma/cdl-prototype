"use client";

import { RotateCcw } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/format";
import { actions } from "@/lib/store";

export function ResetDemoButton({ className }: { className?: string }) {
  const toast = useToast();
  return (
    <button
      type="button"
      onClick={() => {
        actions.resetEverything();
        toast("Demo data reset", "Discovery answers, purchases and progress were cleared.");
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 transition hover:text-ink hover:ring-slate-300",
        className,
      )}
    >
      <RotateCcw className="size-3.5" aria-hidden />
      Reset demo data
    </button>
  );
}
