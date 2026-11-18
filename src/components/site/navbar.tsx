"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { UserMenu, useLogout } from "@/components/site/user-menu";
import { Button, ButtonLink } from "@/components/ui/button";
import { Logo } from "@/components/ui/misc";
import { brand } from "@/config/brand";
import { cn } from "@/lib/format";
import { useAppState } from "@/lib/store";
import type { SessionView } from "@/modules/auth/types";

// V5 header (D81): Career Discovery, Courses, My Learning, then Log in or the account menu.
// The saved report is reached from Career Discovery and the My SELF card (E5-S4), so it has no nav link.
const LINKS = [
  { href: "/discover", label: "Career Discovery", exact: true },
  { href: "/learn", label: "Courses" },
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
        const active =
          pathname === link.href || (!link.exact && link.href !== "/" && pathname?.startsWith(link.href + "/"));
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 font-semibold transition-colors hover:text-brand-600",
              vertical ? "rounded-[14px] px-4 text-base" : "text-[15px]",
              active ? "text-brand-600" : "text-ink",
              vertical && active && "bg-brand-50",
            )}
          >
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

  return (
    <>
      {/* Dims the page under the open phone menu; a tap on it closes the menu. */}
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
      <header className="sticky top-0 z-50 border-b border-line bg-white">
        <nav
          className="mx-auto flex max-w-7xl items-center gap-3 px-4.5 py-2.5 sm:px-6 md:gap-7 lg:px-8"
          aria-label="Main"
        >
          <Link
            href="/"
            aria-label={`${brand.name} home`}
            className="mr-auto inline-flex min-h-11 shrink-0 items-center"
          >
            <Logo />
          </Link>

          <div className="hidden items-center gap-5.5 md:flex">
            <Suspense fallback={<NavLinks />}>
              <ActiveNavLinks />
            </Suspense>
          </div>

          {session ? (
            <span className="hidden md:block">
              <UserMenu session={session} />
            </span>
          ) : (
            <Link
              href="/login"
              className="hidden min-h-11 items-center text-[15px] font-semibold text-ink transition-colors hover:text-brand-600 md:inline-flex"
            >
              Log in
            </Link>
          )}

          <button
            ref={menuButton}
            type="button"
            className="-mr-1.5 grid size-11 place-items-center rounded-full text-ink hover:bg-mist md:hidden"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              id="mobile-menu"
              className="overflow-hidden border-t border-line bg-white md:hidden"
            >
              {/* scrolls inside itself on short phones, since the page behind is locked */}
              <div className="flex max-h-[calc(100dvh-4.5rem)] flex-col gap-1 overflow-y-auto overscroll-contain px-4.5 py-4">
                <Suspense fallback={<NavLinks vertical onNavigate={() => setOpen(false)} />}>
                  <ActiveNavLinks vertical onNavigate={() => setOpen(false)} />
                </Suspense>
                {session ? (
                  <div className="mt-3 rounded-[20px] border border-line bg-paper p-3">
                    <p className="text-sm text-muted">
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
                  <ButtonLink href="/login" className="mt-3" onClick={() => setOpen(false)}>
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
