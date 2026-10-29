"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CreditCard, PhoneCall, Users, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/format";

type Item = { label: string; href: string | null; icon: LucideIcon };

// Sections without a page yet have no href: they show as "Soon" until their module lands.
const ITEMS: Item[] = [
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Courses", href: null, icon: BookOpen },
  { label: "Purchases", href: null, icon: CreditCard },
  { label: "Leads", href: null, icon: PhoneCall },
];

const row = "flex min-h-11 items-center gap-3 rounded-full px-3 text-sm font-semibold";

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      <p className="mb-1.5 px-3 text-[11px] font-bold tracking-[0.16em] text-slate-500 uppercase">Manage</p>
      {ITEMS.map(({ label, href, icon: Icon }) =>
        href ? (
          <Link
            key={label}
            href={href}
            onClick={onNavigate}
            aria-current={pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined}
            className={cn(
              row,
              "transition-colors",
              pathname === href || pathname.startsWith(`${href}/`)
                ? "bg-brand-50 text-brand-700"
                : "text-slate-700 hover:bg-slate-900/[0.04] hover:text-ink",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            {label}
          </Link>
        ) : (
          <span key={label} aria-disabled="true" className={cn(row, "text-slate-500")}>
            <Icon className="size-[18px]" aria-hidden />
            <span className="flex-1">{label}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-slate-600 uppercase">
              Soon
            </span>
          </span>
        ),
      )}
    </nav>
  );
}
