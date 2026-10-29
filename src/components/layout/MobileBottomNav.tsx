"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { Home, ClipboardList, FileText, MessageCircle, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  /** Path prefixes that light this tab up; the longest match wins. */
  match: string[];
  exact?: boolean;
  badgeKey?: "messages";
};

// Mirrors the account sidebars (AccountSidebar) — on phones this bar IS the
// account menu. Credits and the account switch live in the shell's top strip.
const PROVIDER_ITEMS: NavItem[] = [
  { href: "/tiekejas", label: "Šiandien", icon: Home, match: ["/tiekejas"], exact: true },
  { href: "/tiekejas/uzklausos", label: "Užklausos", icon: Search, match: ["/tiekejas/uzklausos", "/tiekejas/uzklausa"] },
  { href: "/tiekejas/pasiulymai", label: "Pasiūlymai", icon: FileText, match: ["/tiekejas/pasiulymai"] },
  { href: "/tiekejas/zinutes", label: "Žinutės", icon: MessageCircle, match: ["/tiekejas/zinutes"], badgeKey: "messages" },
  { href: "/tiekejas/profilis", label: "Profilis", icon: User, match: ["/tiekejas/profilis", "/tiekejas/planai"] },
];

const CUSTOMER_ITEMS: NavItem[] = [
  { href: "/paskyra", label: "Pradžia", icon: Home, match: ["/paskyra"], exact: true },
  { href: "/paskyra/uzklausos", label: "Užklausos", icon: ClipboardList, match: ["/paskyra/uzklausos", "/uzklausos/sekti"] },
  { href: "/paskyra/zinutes", label: "Žinutės", icon: MessageCircle, match: ["/paskyra/zinutes"], badgeKey: "messages" },
  { href: "/paskyra/profilis", label: "Duomenys", icon: User, match: ["/paskyra/profilis"] },
];

const HIDDEN_PREFIXES = ["/admin", "/prisijungti", "/registruotis", "/zinutes/"];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return item.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export default function MobileBottomNav() {
  const pathname = usePathname() ?? "/";
  const { data: session, status } = useSession();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const role = session?.user?.role;
  const userId = session?.user?.id;
  const isHiddenRoute = HIDDEN_PREFIXES.some((p) => pathname.startsWith(p));
  // The area decides the menu, not the role: a provider browsing their own
  // requests under /paskyra gets the customer menu.
  const inProviderArea =
    pathname.startsWith("/tiekejas") ||
    (role === "PROVIDER" && !pathname.startsWith("/paskyra") && !pathname.startsWith("/uzklausos/sekti"));

  useEffect(() => {
    if (status !== "authenticated" || !userId || isHiddenRoute) {
      return;
    }

    let cancelled = false;
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;

    const endpoint = inProviderArea ? "/api/tiekejas/zinutes?summary=1" : "/api/paskyra/zinutes";

    const loadUnreadMessages = () => {
      if (document.visibilityState !== "visible") return;
      fetch(endpoint, { cache: "no-store" })
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
    };

    loadUnreadMessages();
    const interval = window.setInterval(loadUnreadMessages, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [inProviderArea, isHiddenRoute, status, userId]);

  if (status !== "authenticated" || !session?.user) return null;
  if (isHiddenRoute) return null;

  const items = inProviderArea ? PROVIDER_ITEMS : CUSTOMER_ITEMS;

  return (
    <nav
      aria-label="Apatinis meniu"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#DBD6CB] bg-[#ECE9E2]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] dark:border-surface-800 dark:bg-surface-900/95 md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around">
        {items.map((item) => {
          const active = isActive(pathname, item);
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
                    <span className="absolute -right-1.5 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold leading-none text-white">
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
