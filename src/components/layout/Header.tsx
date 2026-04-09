"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Menu, X, LogOut, LayoutDashboard, ChevronRight, Sparkles } from "lucide-react";
import { APP_NAME } from "@/lib/constants";
import NotificationBell from "@/components/layout/NotificationBell";

export default function Header() {
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = session?.user?.role;
  const isProvider = role === "PROVIDER";
  const isAdmin = role === "ADMIN";

  return (
    <header className="sticky top-0 z-40 border-b border-surface-200/40 bg-white/80 backdrop-blur-xl dark:border-surface-800/40 dark:bg-surface-950/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-8 w-8 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm transition-shadow group-hover:shadow-glow">
              <span className="text-white font-bold text-sm">P</span>
            </div>
            <span className="text-heading-3 tracking-tight text-surface-900 dark:text-white">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/tiekejai"
              className="px-3.5 py-2 text-body-sm font-medium text-surface-600 hover:text-surface-900 rounded-xl hover:bg-surface-100/80 transition-all duration-200 dark:text-surface-400 dark:hover:text-white dark:hover:bg-surface-800/50"
            >
              Tiekėjai
            </Link>
            <Link
              href="/uzklausos"
              className="px-3.5 py-2 text-body-sm font-medium text-surface-600 hover:text-surface-900 rounded-xl hover:bg-surface-100/80 transition-all duration-200 dark:text-surface-400 dark:hover:text-white dark:hover:bg-surface-800/50"
            >
              Užklausos
            </Link>
            <Link
              href="/uzklausos/nauja"
              className="px-3.5 py-2 text-body-sm font-medium text-surface-600 hover:text-surface-900 rounded-xl hover:bg-surface-100/80 transition-all duration-200 dark:text-surface-400 dark:hover:text-white dark:hover:bg-surface-800/50"
            >
              Pateikti užklausą
            </Link>

            {!session && (
              <>
                <Link
                  href="/tiekejams"
                  className="px-3.5 py-2 text-body-sm font-medium text-surface-600 hover:text-surface-900 rounded-xl hover:bg-surface-100/80 transition-all duration-200 dark:text-surface-400 dark:hover:text-white dark:hover:bg-surface-800/50"
                >
                  Tiekėjams
                </Link>
                <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1" />
                <Link
                  href="/prisijungti"
                  className="px-3.5 py-2 text-body-sm font-medium text-surface-600 hover:text-surface-900 rounded-xl hover:bg-surface-100/80 transition-all duration-200 dark:text-surface-400 dark:hover:text-white dark:hover:bg-surface-800/50"
                >
                  Prisijungti
                </Link>
                <Link
                  href="/registruotis"
                  className="ml-1 px-5 py-2 text-body-sm font-medium bg-brand-600 text-white rounded-xl hover:bg-brand-700 shadow-sm shadow-brand-600/20 transition-all duration-200 hover:shadow-md hover:shadow-brand-600/25"
                >
                  Registruotis
                </Link>
              </>
            )}

            {session && (
              <>
                <Link
                  href="/paskyra/uzklausos"
                  className="px-3.5 py-2 text-body-sm font-medium text-surface-600 hover:text-surface-900 rounded-xl hover:bg-surface-100/80 transition-all duration-200 dark:text-surface-400 dark:hover:text-white dark:hover:bg-surface-800/50"
                >
                  Mano užklausos
                </Link>

                {isProvider && (
                  <Link
                    href="/tiekejas"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-body-sm font-medium text-surface-600 hover:text-surface-900 rounded-xl hover:bg-surface-100/80 transition-all duration-200 dark:text-surface-400 dark:hover:text-white dark:hover:bg-surface-800/50"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Tiekėjo panelė
                  </Link>
                )}

                {!isProvider && !isAdmin && (
                  <Link
                    href="/tiekejams"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-body-sm font-medium text-brand-600 hover:text-brand-700 rounded-xl hover:bg-brand-50 transition-all duration-200 dark:text-brand-400 dark:hover:text-brand-300 dark:hover:bg-brand-500/10"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Tapti tiekėju
                  </Link>
                )}

                {isAdmin && (
                  <Link
                    href="/admin"
                    className="flex items-center gap-1.5 px-3.5 py-2 text-body-sm font-medium text-surface-600 hover:text-surface-900 rounded-xl hover:bg-surface-100/80 transition-all duration-200 dark:text-surface-400 dark:hover:text-white dark:hover:bg-surface-800/50"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Admin
                  </Link>
                )}

                <NotificationBell />
                <div className="w-px h-5 bg-surface-200 dark:bg-surface-700 mx-1" />
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-body-sm font-medium text-surface-500 hover:text-red-600 rounded-xl hover:bg-red-50 transition-all duration-200 dark:text-surface-500 dark:hover:text-red-400 dark:hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                  Atsijungti
                </button>
              </>
            )}
          </nav>

          {/* Mobile toggle */}
          <button
            className="md:hidden rounded-xl p-2 text-surface-600 hover:bg-surface-100 transition-colors dark:text-surface-400 dark:hover:bg-surface-800"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-surface-200/50 py-3 animate-slide-down dark:border-surface-700/50">
            <div className="flex flex-col gap-0.5">
              <MobileLink href="/tiekejai" onClick={() => setMobileOpen(false)}>Tiekėjai</MobileLink>
              <MobileLink href="/uzklausos" onClick={() => setMobileOpen(false)}>Užklausos</MobileLink>
              <MobileLink href="/uzklausos/nauja" onClick={() => setMobileOpen(false)}>Pateikti užklausą</MobileLink>
              {!session && (
                <>
                  <MobileLink href="/tiekejams" onClick={() => setMobileOpen(false)}>Tiekėjams</MobileLink>
                  <MobileLink href="/prisijungti" onClick={() => setMobileOpen(false)}>Prisijungti</MobileLink>
                  <MobileLink href="/registruotis" onClick={() => setMobileOpen(false)} highlight>Registruotis</MobileLink>
                </>
              )}
              {session && (
                <>
                  <MobileLink href="/paskyra/uzklausos" onClick={() => setMobileOpen(false)}>Mano užklausos</MobileLink>
                  {isProvider && <MobileLink href="/tiekejas" onClick={() => setMobileOpen(false)}>Tiekėjo panelė</MobileLink>}
                  {!isProvider && !isAdmin && <MobileLink href="/tiekejams" onClick={() => setMobileOpen(false)} highlight>Tapti tiekėju</MobileLink>}
                  {isAdmin && <MobileLink href="/admin" onClick={() => setMobileOpen(false)}>Admin panelė</MobileLink>}
                  <button
                    onClick={() => { signOut({ callbackUrl: "/" }); setMobileOpen(false); }}
                    className="flex items-center justify-between w-full px-3 py-2.5 text-body-sm font-medium text-red-600 rounded-xl hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
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

function MobileLink({ href, onClick, children, highlight }: { href: string; onClick: () => void; children: React.ReactNode; highlight?: boolean }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center justify-between px-3 py-2.5 text-body-sm font-medium rounded-xl transition-colors ${
        highlight
          ? "text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-500/10"
          : "text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800"
      }`}
    >
      {children}
      <ChevronRight className="h-4 w-4 text-surface-400" />
    </Link>
  );
}
