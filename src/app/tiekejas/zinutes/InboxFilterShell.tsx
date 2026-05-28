"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

type InboxTab = "all" | "unread" | "archived";

const TABS: { value: InboxTab; label: string; href: string }[] = [
  { value: "all", label: "Visi", href: "/tiekejas/zinutes" },
  { value: "unread", label: "Neperskaityti", href: "/tiekejas/zinutes?tab=unread" },
  { value: "archived", label: "Archyvas", href: "/tiekejas/zinutes?tab=archived" },
];

/**
 * Presentational tab bar. URL-driven (plain <Link>s) so it works both as the
 * Suspense fallback (active="all") and inside the client shell below.
 */
export function InboxTabsBar({ active }: { active: InboxTab }) {
  return (
    <div className="mb-6 flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
      {TABS.map((tab) => {
        const isActive = active === tab.value;
        return (
          <Link
            key={tab.value}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={`flex min-h-[44px] flex-1 items-center justify-center rounded-lg px-3 py-2 text-body-sm font-medium transition-colors ${
              isActive
                ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

/**
 * Reads the active tab from the URL so the bar highlights immediately and stays
 * usable while the conversation list streams in its own boundary below.
 */
export function InboxFilterShell() {
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const active: InboxTab = raw === "unread" || raw === "archived" ? raw : "all";
  return <InboxTabsBar active={active} />;
}
