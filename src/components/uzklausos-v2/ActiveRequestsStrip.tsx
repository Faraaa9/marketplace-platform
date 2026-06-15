"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface MineSummary {
  activeCount: number;
  unreadCount: number;
}

function activeRequestsLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} aktyvi užklausa`;
  if (mod10 >= 2 && mod10 <= 9 && (mod100 < 11 || mod100 > 19)) {
    return `${count} aktyvios užklausos`;
  }
  return `${count} aktyvių užklausų`;
}

/** Quiet one-line link to the user's live requests, shown on the new-request
 *  page so people who already posted can jump back to their proposals instead
 *  of wondering where the previous request went. Renders nothing for guests
 *  and for users with no active requests. */
export default function ActiveRequestsStrip() {
  const { status } = useSession();
  const [summary, setSummary] = useState<MineSummary | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/requests/mine/summary");
        const data = (await res.json().catch(() => null)) as
          | { success?: boolean; data?: MineSummary }
          | null;
        if (!cancelled && res.ok && data?.success && data.data) {
          setSummary(data.data);
        }
      } catch {
        // The strip is a convenience — fail silently.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (!summary || summary.activeCount === 0) return null;

  return (
    <Link
      href="/paskyra/uzklausos"
      className="mt-4 flex items-center gap-2.5 rounded-2xl border border-surface-200/60 bg-white px-4 py-3 transition-shadow hover:shadow-card dark:border-surface-700/50 dark:bg-surface-900/50"
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 motion-safe:animate-pulse"
      />
      <span className="min-w-0 truncate text-body-sm text-surface-500 dark:text-surface-400">
        <span className="font-semibold text-surface-900 dark:text-surface-100">
          {activeRequestsLabel(summary.activeCount)}
        </span>
        {summary.unreadCount > 0 ? " - laukia tavęs" : " - gyvai"}
      </span>
      {summary.unreadCount > 0 && (
        <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold text-white">
          {summary.unreadCount > 9 ? "9+" : summary.unreadCount}
        </span>
      )}
      <span className="ml-auto shrink-0 text-body-sm font-medium text-brand-600 dark:text-brand-400">
        Mano užklausos →
      </span>
    </Link>
  );
}
