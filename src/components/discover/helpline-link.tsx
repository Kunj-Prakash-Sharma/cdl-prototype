import { HeartHandshake } from "lucide-react";
import { helpline } from "@/config/helpline";
import { cn } from "@/lib/format";

/** Always visible on the chat screens (decision D70). Wording, number and link come from src/config/helpline.ts. */
export function HelplineLink({ className, large = false }: { className?: string; large?: boolean }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-500",
        large ? "justify-center rounded-2xl bg-white p-5 text-base shadow-soft ring-1 ring-slate-200/80" : "text-xs",
        className,
      )}
      data-testid="helpline"
    >
      <HeartHandshake className={cn("shrink-0 text-brand-600", large ? "size-6" : "size-4")} aria-hidden />
      <span>{helpline.prompt}</span>
      <a
        href={helpline.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center font-semibold text-brand-700 underline underline-offset-2 sm:min-h-0"
      >
        {helpline.name}
      </a>
      <a
        href={`tel:${helpline.phone}`}
        className="inline-flex min-h-11 items-center font-semibold text-brand-700 sm:min-h-0"
      >
        {helpline.phoneDisplay}
      </a>
      {helpline.placeholder && (
        <span className="rounded-full bg-sun-100 px-2 py-0.5 text-[11px] font-semibold text-sun-700">placeholder</span>
      )}
    </div>
  );
}
