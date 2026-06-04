"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { LayoutDashboard, ClipboardList, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  matchPrefix: string;
  badgeKey?: "messages";
};

const PROVIDER_ITEMS: NavItem[] = [
  { href: "/tiekejas", label: "Panelė", icon: LayoutDashboard, matchPrefix: "/tiekejas" },
  { href: "/tiekejas/uzklausos", label: "Užklausos", icon: ClipboardList, matchPrefix: "/tiekejas/uzklausos" },
  { href: "/tiekejas/zinutes", label: "Žinutės", icon: MessageCircle, matchPrefix: "/tiekejas/zinutes", badgeKey: "messages" },
];

const CUSTOMER_ITEMS: NavItem[] = [
  { href: "/uzklausos", label: "Užklausos", icon: ClipboardList, matchPrefix: "/uzklausos" },
  { href: "/paskyra/uzklausos", label: "Mano", icon: ClipboardList, matchPrefix: "/paskyra/uzklausos" },
  { href: "/paskyra/zinutes", label: "Žinutės", icon: MessageCircle, matchPrefix: "/paskyra/zinutes", badgeKey: "messages" },
  { href: "/paskyra/profilis", label: "Profilis", icon: User, matchPrefix: "/paskyra/profilis" },
];

const HIDDEN_PREFIXES = ["/admin", "/prisijungti", "/registruotis", "/zinutes/", "/tiekejas/zinutes"];

function isActive(pathname: string, item: NavItem, allItems: NavItem[]) {
  // For nested routes like /tiekejas/uzklausos, prefer the more specific match
  // over the parent /tiekejas, so only one tab highlights at a time.
  const matches = allItems.filter((i) =>
    i.href === "/tiekejas"
      ? pathname === "/tiekejas"
      : pathname === i.matchPrefix || pathname.startsWith(`${i.matchPrefix}/`)
  );
  if (matches.length === 0) return false;
  const best = matches.reduce((a, b) => (b.matchPrefix.length > a.matchPrefix.length ? b : a));
  return best.href === item.href;
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const { data: session, status } = useSession();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const role = session?.user?.role;
  const userId = session?.user?.id;

  useEffect(() => {
    if (status !== "authenticated" || !userId) {
      return;
    }

    let cancelled = false;
    const endpoint = role === "PROVIDER" ? "/api/tiekejas/zinutes" : "/api/paskyra/zinutes";

    fetch(endpoint)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.success) return;
        const totalUnread =
          typeof data.data?.totalUnread === "number"
            ? data.data.totalUnread
            : Array.isArray(data.data?.conversations)
              ? data.data.conversations.filter((c: { unread?: boolean }) => c.unread).length
              : 0;
        setUnreadMessages(totalUnread);
      })
      .catch(() => {
        if (!cancelled) setUnreadMessages(0);
      });

    return () => {
      cancelled = true;
    };
  }, [role, status, userId]);

  if (status !== "authenticated" || !session?.user) return null;
  if (HIDDEN_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  const items = role === "PROVIDER" ? PROVIDER_ITEMS : CUSTOMER_ITEMS;

  return (
    <nav
      aria-label="Apatinis meniu"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#DBD6CB] bg-[#ECE9E2]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] dark:border-surface-800 dark:bg-surface-900/95 md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item, items);
          const Icon = item.icon;
          const showBadge = item.badgeKey === "messages" && unreadMessages > 0;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-14 min-h-[44px] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-[#26231F] dark:text-surface-100"
                    : "text-[#7A746A] hover:text-[#26231F] dark:text-surface-400 dark:hover:text-surface-200"
                )}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active && "stroke-[2.25]")} />
                  {showBadge && (
                    <span className="absolute -right-1.5 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#C25E3A] px-1 text-[10px] font-bold leading-none text-white">
                      {unreadMessages > 9 ? "9+" : unreadMessages}
                    </span>
                  )}
                </span>
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
