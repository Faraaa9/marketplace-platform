"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface MineSummary {
  activeCount: number;
  unreadCount: number;
}

// Dedupe the summary fetch across the desktop and mobile instances of the
// link within one page load.
let summaryPromise: Promise<MineSummary | null> | null = null;

function fetchSummary(): Promise<MineSummary | null> {
  summaryPromise ??= fetch("/api/requests/mine/summary")
    .then(async (res) => {
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; data?: MineSummary }
        | null;
      return res.ok && data?.success && data.data ? data.data : null;
    })
    .catch(() => null);
  return summaryPromise;
}

/** "Mano užklausos" nav link with an unread-responses badge. Renders nothing
 *  for guests and for users who never posted a request. */
export default function MyRequestsNavLink({
  className,
  onClick,
}: {
  className: string;
  onClick?: () => void;
}) {
  const { status } = useSession();
  const [summary, setSummary] = useState<MineSummary | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    void fetchSummary().then((data) => {
      if (!cancelled) setSummary(data);
    });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status !== "authenticated" || !summary || summary.activeCount === 0) {
    return null;
  }

  return (
    <Link href="/paskyra/uzklausos" onClick={onClick} className={className}>
      <span className="inline-flex items-center gap-1.5">
        Mano užklausos
        {summary.unreadCount > 0 && (
          <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold leading-none text-white">
            {summary.unreadCount > 9 ? "9+" : summary.unreadCount}
          </span>
        )}
      </span>
    </Link>
  );
}
