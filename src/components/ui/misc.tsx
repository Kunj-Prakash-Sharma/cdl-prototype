import type { ReactNode } from "react";
import { Star } from "lucide-react";
import { cn } from "@/lib/format";

type Tone = "brand" | "sun" | "green" | "slate" | "dark" | "white";

const tones: Record<Tone, string> = {
  brand: "bg-brand-50 text-brand-700 ring-brand-200/70",
  sun: "bg-sun-100 text-sun-700 ring-sun-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200/70",
  slate: "bg-slate-100 text-slate-600 ring-slate-200",
  dark: "bg-ink/80 text-white ring-white/10 backdrop-blur",
  white: "bg-white/90 text-ink ring-white/60 backdrop-blur",
};

export function Badge({ tone = "brand", className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-xs font-bold uppercase tracking-[0.18em] text-brand-600", className)}>{children}</p>
  );
}

export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="relative grid size-8 place-items-center overflow-hidden rounded-xl bg-linear-to-br from-brand-500 via-brand-700 to-brand-950 shadow-glow">
        <span className="absolute -right-2 -top-2 size-5 rounded-full bg-sun-400/90 blur-[2px]" />
        <span className="relative font-serif text-[19px] italic leading-none text-white">s</span>
      </span>
      <span className={cn("text-[19px] font-extrabold tracking-tight", inverted ? "text-white" : "text-ink")}>
        SELF
      </span>
    </span>
  );
}

export function ProgressBar({
  value,
  className,
  tone = "brand",
}: {
  value: number;
  className?: string;
  tone?: "brand" | "green" | "white";
}) {
  const fill = { brand: "bg-brand-600", green: "bg-emerald-500", white: "bg-white" }[tone];
  const track = { brand: "bg-brand-100", green: "bg-emerald-100", white: "bg-white/20" }[tone];
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full", track, className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", fill)}
        style={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }}
      />
    </div>
  );
}

export function Rating({ value, reviews, className }: { value: number; reviews?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)}>
      <Star className="size-4 fill-sun-400 text-sun-400" aria-hidden />
      <span className="font-semibold text-ink">{value.toFixed(1)}</span>
      {reviews !== undefined && <span className="text-slate-500">({reviews.toLocaleString("en-IN")})</span>}
    </span>
  );
}

export function Avatar({ initials, className }: { initials: string; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-10 shrink-0 place-items-center rounded-full bg-linear-to-br from-brand-100 to-sun-100 text-sm font-bold text-brand-800 ring-2 ring-white",
        className,
      )}
    >
      {initials}
    </span>
  );
}

export function SageAvatar({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "size-8", md: "size-10", lg: "size-16" }[size];
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", dims, className)}>
      <span className="absolute inset-0 rounded-full bg-linear-to-br from-brand-400 via-fuchsia-500 to-sun-400" />
      <span className="absolute inset-[3px] rounded-full bg-linear-to-br from-brand-700 to-brand-950" />
      <span className="absolute inset-[30%] rounded-full bg-linear-to-br from-white via-brand-200 to-sun-300 blur-[1px]" />
    </span>
  );
}
