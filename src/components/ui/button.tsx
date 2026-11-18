import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "dark" | "light" | "sun";
type Size = "sm" | "md" | "lg";

// V5 pill buttons (D81): bold label, 1.5px border on every variant so filled and outline buttons line up,
// at least 44px tall (48px from md up).
const base =
  "inline-flex items-center justify-center gap-2 rounded-full border-[1.5px] font-bold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "border-brand-600 bg-brand-600 text-white hover:border-brand-800 hover:bg-brand-800",
  secondary: "border-line-strong bg-white text-ink hover:border-brand-600",
  ghost: "border-transparent text-ink hover:text-brand-600",
  dark: "border-ink bg-ink text-white hover:border-brand-950 hover:bg-brand-950",
  light: "border-white bg-white text-ink hover:border-brand-50 hover:bg-brand-50",
  sun: "border-sun-400 bg-sun-400 text-ink hover:border-sun-300 hover:bg-sun-300",
};

const sizes: Record<Size, string> = {
  sm: "min-h-11 px-4 text-sm",
  md: "min-h-12 px-5.5 text-base",
  lg: "min-h-13 px-7 text-base",
};

type CommonProps = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & Omit<ComponentProps<"button">, "className" | "children">) {
  return (
    <button type="button" className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: CommonProps & Omit<ComponentProps<typeof Link>, "className" | "children">) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  );
}
