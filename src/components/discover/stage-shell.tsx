import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/misc";

/** Shared header + container for the assessment stages. */
export function StageShell({
  icon: Icon,
  part,
  title,
  subtitle,
  aside,
  children,
}: {
  icon: LucideIcon;
  part: string;
  title: string;
  subtitle: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge tone="brand">
            <Icon className="size-3.5" aria-hidden /> {part}
          </Badge>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
          <p className="mt-2 text-slate-600">{subtitle}</p>
        </div>
        {aside}
      </div>
      {children}
    </div>
  );
}

export function SectionComplete({
  title,
  body,
  action,
  children,
}: {
  title: string;
  body: string;
  action: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-3xl bg-white p-8 text-center shadow-soft ring-1 ring-slate-200/80 sm:p-12">
      <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50">
        <svg
          viewBox="0 0 24 24"
          className="size-8 text-emerald-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 12.5l4.5 4.5L19 7.5" className="animate-draw [stroke-dasharray:24] [stroke-dashoffset:24]" />
        </svg>
      </div>
      <h2 className="mt-5 text-2xl font-bold text-ink">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-slate-600">{body}</p>
      {children}
      <div className="mt-8 flex justify-center">{action}</div>
    </div>
  );
}
