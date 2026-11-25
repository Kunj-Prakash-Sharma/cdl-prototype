import Link from "next/link";
import { Logo } from "@/components/ui/misc";
import { brand } from "@/config/brand";

// V5 footer, dark single-row form (D91). Privacy, Terms and Refunds links are added when those pages exist.
const LINKS = [
  { href: "/#faq", label: "FAQ" },
  { href: "/learn", label: "Courses" },
];

export function Footer() {
  return (
    <footer className="bg-ink text-white/80">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-10 gap-y-2 px-4.5 py-8 sm:px-6 lg:px-8">
        <span className="mr-auto w-full sm:w-auto">
          <Logo className="h-8 sm:h-9" />
        </span>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-8">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="inline-flex min-h-11 items-center text-sm transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="w-full text-[13px] text-white/60 sm:w-auto">© 2026 {brand.name} · India</p>
      </div>
    </footer>
  );
}
