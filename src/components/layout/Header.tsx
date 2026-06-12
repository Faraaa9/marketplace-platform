"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/layout/NotificationBell";
import UserMenu from "@/components/layout/UserMenu";
import ThemeToggle from "@/components/layout/ThemeToggle";
import GlobalStoriesStrip from "@/components/stories/GlobalStoriesStrip";
import { getUserMenuLinks } from "@/lib/redirects";

const NAV_LINKS = [
  { href: "/meistrai", label: "Meistrai" },
  { href: "/uzklausos", label: "Užklausos" },
  { href: "/uzklausos/nauja", label: "Pateikti užklausą" },
];

export default function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const menuLinks = getUserMenuLinks(session?.user?.role);
  const userEmail = session?.user?.email ?? "";

  const solid = scrolled || mobileOpen;

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-colors duration-300",
        solid
          ? "border-b border-surface-200 bg-surface-0/85 backdrop-blur-md dark:border-surface-800 dark:bg-surface-900/85"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <div className="flex h-[72px] items-center justify-between">
          {/* Logo + Global stories strip */}
          <div className="min-w-0 flex-1 md:flex-initial">
            <GlobalStoriesStrip />
          </div>

          {/* Center nav — identical on every page */}
          <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-6 md:flex lg:gap-8">
            {NAV_LINKS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-body-sm text-surface-600 transition-colors hover:text-surface-900 dark:text-surface-400 dark:hover:text-surface-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2.5">
            <ThemeToggle />
            {!session ? (
              <>
                <Link
                  href="/prisijungti"
                  className="hidden rounded-full border border-surface-200 bg-surface-50/70 px-4 py-2 text-sm font-medium text-surface-900 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800/70 dark:text-surface-100 dark:hover:bg-surface-700 sm:inline-flex"
                >
                  Prisijungti
                </Link>
                <Link
                  href="/registruotis"
                  className="inline-flex rounded-full bg-surface-900 px-4 py-2 text-sm font-medium text-surface-50 transition-colors hover:bg-surface-800 dark:bg-surface-100 dark:text-surface-900 dark:hover:bg-white"
                >
                  Registruotis
                </Link>
              </>
            ) : (
              <>
                <NotificationBell />
                <UserMenu />
              </>
            )}

            <button
              className="rounded-lg p-2 text-surface-600 transition-colors hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800 md:hidden"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Meniu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="border-t border-surface-200 py-3 dark:border-surface-800 md:hidden">
            <div className="flex flex-col gap-0.5">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-sm font-medium text-surface-900 hover:bg-surface-100 dark:text-surface-100 dark:hover:bg-surface-800"
                >
                  {item.label}
                </Link>
              ))}
              <div className="my-1.5 h-px bg-surface-200 dark:bg-surface-800" />
              {!session ? (
                <>
                  <Link
                    href="/prisijungti"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-surface-900 hover:bg-surface-100 dark:text-surface-100 dark:hover:bg-surface-800"
                  >
                    Prisijungti
                  </Link>
                  <Link
                    href="/registruotis"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-3 py-2.5 text-sm font-medium text-brand-500 hover:bg-surface-100 dark:text-brand-400 dark:hover:bg-surface-800"
                  >
                    Registruotis
                  </Link>
                </>
              ) : (
                <>
                  <div className="px-3 py-2">
                    <p className="truncate text-sm font-normal text-surface-900 dark:text-surface-100">
                      {userEmail || "Paskyra"}
                    </p>
                  </div>
                  {menuLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMobileOpen(false)}
                      className="rounded-xl px-3 py-2.5 text-sm font-medium text-surface-900 hover:bg-surface-100 dark:text-surface-100 dark:hover:bg-surface-800"
                    >
                      {link.label}
                    </Link>
                  ))}
                  <button
                    onClick={() => {
                      signOut({ callbackUrl: "/" });
                      setMobileOpen(false);
                    }}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium text-surface-900 hover:bg-surface-100 dark:text-surface-100 dark:hover:bg-surface-800"
                  >
                    Atsijungti
                    <LogOut className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
