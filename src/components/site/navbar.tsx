"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, Sparkles, X } from "lucide-react";
import { UserMenu, useLogout } from "@/components/site/user-menu";
import { Button, ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/misc";
import { cn } from "@/lib/format";
import { useAppState } from "@/lib/store";
import type { SessionView } from "@/modules/auth/types";

const LINKS = [
  { href: "/discover", label: "Career Discovery", ai: true },
  { href: "/learn", label: "Level 1 Learning" },
  { href: "/my-self", label: "My Learning", count: true },
];

function NavLinks({
  pathname,
  onNavigate,
  vertical,
}: {
  pathname?: string;
  onNavigate?: () => void;
  vertical?: boolean;
}) {
  const { purchases } = useAppState();
  return (
    <>
      {LINKS.map((link) => {
        const active = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href + "/"));
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            className={cn(
              "relative inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
              vertical ? "px-4 py-3 text-base" : "px-3.5 py-2 text-sm",
              active ? "bg-brand-50 text-brand-700" : "text-slate-600 hover:bg-slate-900/[0.04] hover:text-ink",
            )}
          >
            {link.ai && <Sparkles className="size-3.5 text-brand-500" aria-hidden />}
            {link.label}
            {link.count && purchases.length > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-brand-600 px-1.5 text-[11px] leading-5 font-bold text-white">
                {purchases.length}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );
}

function ActiveNavLinks(props: { onNavigate?: () => void; vertical?: boolean }) {
  const pathname = usePathname();
  return <NavLinks pathname={pathname} {...props} />;
}

export function Navbar({ session }: { session: SessionView | null }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { completedAt } = useAppState();
  const { run: runLogout, pending: loggingOut } = useLogout();
  const menuButton = useRef<HTMLButtonElement>(null);

  // While the phone menu is open: the page behind it does not scroll, Escape closes it (focus goes back to the
  // button), and it closes by itself if the window grows to the desktop layout.
  useEffect(() => {
    if (!open) return;
    const { body, documentElement: root } = document;
    const previous = { body: body.style.overflow, root: root.style.overflow };
    body.style.overflow = "hidden";
    root.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      menuButton.current?.focus();
    };
    const desktop = window.matchMedia("(min-width: 768px)");
    const onResize = () => desktop.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    return () => {
      body.style.overflow = previous.body;
      root.style.overflow = previous.root;
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const cta = completedAt
    ? { href: "/discover", label: "View my report" }
    : { href: "/discover", label: "Start free discovery" };

  return (
    <>
      {/* Dims the page under the open phone menu; a tap on it closes the menu. A sibling of the header (not a child)
        because the header's backdrop blur would otherwise become the containing block of a fixed element. */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-ink/40 md:hidden"
            onClick={() => setOpen(false)}
            aria-hidden
          />
        )}
      </AnimatePresence>
      <header
        className={cn(
          "sticky top-0 z-50 transition-all duration-300",
          open
            ? "border-b border-slate-200/70 bg-white"
            : scrolled
              ? "border-b border-slate-200/70 bg-white/80 backdrop-blur-xl"
              : "border-b border-transparent bg-transparent",
        )}
      >
        <nav
          className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
          aria-label="Main"
        >
          <Link href="/" aria-label="SELF home" className="shrink-0">
            <Logo />
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Suspense fallback={<NavLinks />}>
              <ActiveNavLinks />
            </Suspense>
          </div>

          <div className="flex items-center gap-2">
            {session ? (
              <span className="hidden md:block">
                <UserMenu session={session} />
              </span>
            ) : (
              <span className="hidden sm:block">
                <ButtonLink href="/login" variant="ghost" size="sm">
                  Log in
                </ButtonLink>
              </span>
            )}
            <span className="hidden sm:block">
              <ButtonLink href={cta.href} size="sm">
                {cta.label}
              </ButtonLink>
            </span>
            <button
              ref={menuButton}
              type="button"
              className="grid size-11 place-items-center rounded-full text-ink hover:bg-slate-900/5 md:hidden"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="mobile-menu"
            >
              {open ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              id="mobile-menu"
              className="overflow-hidden border-t border-slate-200/70 bg-white md:hidden"
            >
              {/* scrolls inside itself on short phones, since the page behind is locked */}
              <div className="flex max-h-[calc(100dvh-4.5rem)] flex-col gap-1 overflow-y-auto overscroll-contain px-4 py-4">
                <Suspense fallback={<NavLinks vertical onNavigate={() => setOpen(false)} />}>
                  <ActiveNavLinks vertical onNavigate={() => setOpen(false)} />
                </Suspense>
                <ButtonLink href={cta.href} className="mt-3" onClick={() => setOpen(false)}>
                  {cta.label}
                </ButtonLink>
                {session ? (
                  <div className="mt-2 rounded-2xl bg-slate-50 p-3">
                    <p className="text-sm text-slate-600">
                      Logged in as <span className="font-semibold text-ink">{session.name || session.phoneMasked}</span>
                      {session.role === "admin" && " (admin)"}
                    </p>
                    {session.role === "admin" && (
                      <ButtonLink href="/admin" variant="ghost" className="mt-1 w-full" onClick={() => setOpen(false)}>
                        Admin
                      </ButtonLink>
                    )}
                    <Button
                      variant="secondary"
                      className="mt-2 w-full"
                      onClick={() => {
                        setOpen(false);
                        runLogout();
                      }}
                      disabled={loggingOut}
                    >
                      {loggingOut ? "Logging out…" : "Log out"}
                    </Button>
                  </div>
                ) : (
                  <ButtonLink href="/login" variant="secondary" className="mt-2" onClick={() => setOpen(false)}>
                    Log in
                  </ButtonLink>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </>
  );
}
