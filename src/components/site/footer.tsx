import Link from "next/link";
import { Logo } from "@/components/ui/misc";

const COLUMNS = [
  {
    title: "Platform",
    links: [
      { href: "/discover", label: "AI Career Discovery" },
      { href: "/learn", label: "Level 1 · Self-paced" },
      { href: "/my-self", label: "My Learning" },
    ],
  },
  {
    title: "Explore",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#levels", label: "Learning levels" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:px-8">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-slate-500">
            The complete career development and learning platform. Discover who you are, then learn the skills to get
            there.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <p className="text-sm font-semibold text-ink">{col.title}</p>
            <ul className="mt-4 space-y-3">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-sm text-slate-500 transition hover:text-brand-700">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-slate-200/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-slate-400 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>© 2026 SELF. Prototype for stakeholder review.</p>
          <p>CDL · AI Career Discovery — Phase 1</p>
        </div>
      </div>
    </footer>
  );
}
