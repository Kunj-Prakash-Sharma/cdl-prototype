import type { ReactNode } from "react";
import Image from "next/image";
import logo from "@/assets/temple-logo.png";
import { brand } from "@/config/brand";
import { cn } from "@/lib/format";

type Tone = "brand" | "sun" | "green" | "slate" | "dark" | "white";

const tones: Record<Tone, string> = {
  brand: "bg-brand-100 text-brand-700 ring-transparent",
  sun: "bg-sun-100 text-sun-700 ring-sun-200",
  green: "bg-success-50 text-success ring-success/20",
  slate: "bg-mist text-muted ring-line",
  dark: "bg-ink/80 text-white ring-white/10 backdrop-blur",
  white: "bg-white/90 text-ink ring-white/60 backdrop-blur",
};

export function Badge({
  tone = "brand",
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
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
  return <p className={cn("text-[13px] font-bold tracking-[1.4px] text-brand-600 uppercase", className)}>{children}</p>;
}

/** The V5 four-point star in brand violet, tilted slightly: the guide's avatar mark in the chat. Decorative. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={cn("size-7 shrink-0 fill-brand-600", className)}>
      <path
        d="M12 1.5C12.9 7.6 16.4 11.1 22.5 12 16.4 12.9 12.9 16.4 12 22.5 11.1 16.4 7.6 12.9 1.5 12 7.6 11.1 11.1 7.6 12 1.5Z"
        transform="rotate(-12 12 12)"
      />
    </svg>
  );
}

/**
 * The client's logo (gold wordmark and tagline on a navy band), D93. It is a flat image, so it reads on light and dark
 * backgrounds alike. Pass the height as `className` (`h-*`, default `h-8`); the width follows the image ratio.
 */
export function Logo({ className, preload = false }: { className?: string; preload?: boolean }) {
  return (
    <Image
      src={logo}
      alt={brand.name}
      preload={preload}
      sizes="240px"
      className={cn("w-auto shrink-0 rounded-[3px]", className ?? "h-8")}
    />
  );
}

export function ProgressBar({
  value,
  className,
  tone = "brand",
  "aria-label": ariaLabel,
}: {
  value: number;
  className?: string;
  tone?: "brand" | "green" | "white";
  "aria-label"?: string;
}) {
  const fill = { brand: "bg-brand-600", green: "bg-success", white: "bg-white" }[tone];
  const track = { brand: "bg-brand-100", green: "bg-success-50", white: "bg-white/20" }[tone];
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full", track, className)}
      role="progressbar"
      aria-label={ariaLabel}
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

/** The guide's round avatar (abstract, no face or initials, so it does not depend on the guide's name). */
export function GuideAvatar({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const dims = { sm: "size-8", md: "size-10", lg: "size-16" }[size];
  return (
    <span className={cn("relative inline-grid shrink-0 place-items-center", dims, className)}>
      <span className="absolute inset-0 rounded-full bg-linear-to-br from-brand-400 via-brand-300 to-sun-400" />
      <span className="absolute inset-[3px] rounded-full bg-linear-to-br from-brand-700 to-brand-950" />
      <span className="absolute inset-[30%] rounded-full bg-linear-to-br from-white via-brand-200 to-sun-300 blur-[1px]" />
    </span>
  );
}
