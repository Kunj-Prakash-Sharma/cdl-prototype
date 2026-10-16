import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/format";

type Variant = "primary" | "secondary" | "ghost" | "dark" | "light" | "sun";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98] whitespace-nowrap";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white shadow-glow hover:bg-brand-700 hover:-translate-y-0.5",
  secondary: "bg-white text-ink ring-1 ring-slate-200 shadow-soft hover:ring-slate-300 hover:-translate-y-0.5",
  ghost: "text-slate-600 hover:text-ink hover:bg-slate-900/5",
  dark: "bg-ink text-white hover:bg-slate-800 hover:-translate-y-0.5",
  light: "bg-white text-ink hover:bg-brand-50 hover:-translate-y-0.5",
  sun: "bg-sun-500 text-white shadow-[0_10px_30px_-10px_rgb(255_138_46/0.7)] hover:bg-sun-600 hover:-translate-y-0.5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-13 px-7 text-base",
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
