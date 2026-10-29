"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, UserCog, FileText, Home, Settings, Shield, ShieldAlert, Inbox, Sparkles, Send, Megaphone, BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin", label: "Suvestinė", icon: Home, badgeKey: null },
  { href: "/admin/tiekejai", label: "Tiekėjai", icon: Users, badgeKey: "pendingActivation" as const },
  { href: "/admin/naudotojai", label: "Naudotojai", icon: UserCog, badgeKey: null },
  { href: "/admin/uzklausos", label: "Užklausos", icon: FileText, badgeKey: "pendingRequests" as const },
  { href: "/admin/claims", label: "Perėmimai", icon: Shield, badgeKey: "pendingClaims" as const },
  { href: "/admin/moderacija", label: "Moderacija", icon: ShieldAlert, badgeKey: "pendingModeration" as const },
  { href: "/admin/laiskai", label: "Laiškai", icon: Inbox, badgeKey: null },
  { href: "/admin/telegram", label: "Telegram", icon: Send, badgeKey: null },
  { href: "/admin/ai", label: "AI", icon: Sparkles, badgeKey: null },
  { href: "/admin/typesafe", label: "Jev laboratorija", icon: BrainCircuit, badgeKey: null },
  { href: "/admin/pranesimai", label: "Pranešimai", icon: Megaphone, badgeKey: null },
  { href: "/admin/nustatymai", label: "Nustatymai", icon: Settings, badgeKey: null },
];

interface NavBadges {
  pendingActivation: number;
  pendingRequests: number;
  pendingClaims: number;
  pendingModeration: number;
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [badges, setBadges] = useState<NavBadges>({ pendingActivation: 0, pendingRequests: 0, pendingClaims: 0, pendingModeration: 0 });

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setBadges({
            pendingActivation: data.data.pendingActivation || 0,
            pendingRequests: data.data.pendingRequests || 0,
            pendingClaims: data.data.pendingClaims || 0,
            pendingModeration: data.data.pendingModeration || 0,
          });
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-[calc(100vh-4rem)]">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-surface-200/50 bg-surface-50 dark:border-surface-800 dark:bg-surface-950 p-4">
        <h2 className="text-heading-3 font-bold text-surface-900 dark:text-white mb-6 px-3">Admin panelė</h2>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                    : "text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {badgeCount > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold text-white">
                    {badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-surface-200/50 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-surface-800 dark:bg-surface-950/95 md:hidden">
        <nav
          aria-label="Administratoriaus skyriai"
          className="flex overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {navItems.map((item) => {
            const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex min-w-[4.75rem] shrink-0 flex-col items-center gap-1 px-2 py-2.5 text-center text-micro font-medium transition-colors",
                  pathname === item.href ? "text-brand-600 dark:text-brand-400" : "text-surface-500"
                )}
              >
                <div className="relative">
                  <item.icon className="h-5 w-5" />
                  {badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                      {badgeCount}
                    </span>
                  )}
                </div>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto pb-16 md:pb-0">{children}</div>
    </div>
  );
}
