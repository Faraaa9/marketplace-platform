"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, ArrowRight } from "lucide-react";
import Card, { CardTitle } from "@/components/ui/Card";

type FollowUpRecipient = "provider" | "client";

interface FollowUpItem {
  type: "response" | "direct";
  id: string;
  href: string;
  title: string;
  daysSinceActivity: number;
  ageDays: number;
  recipient: FollowUpRecipient;
  actionLabel: string;
  reason: string;
  bucket: string;
}

interface FollowUpsResponse {
  success: boolean;
  data?: {
    threads: FollowUpItem[];
    totals: {
      totalThreads: number;
      countsByBucket: Record<string, number>;
    };
  };
}

/**
 * Provider-facing Follow-Up Agent card.
 *
 * Advisory only: fetches `/api/tiekejas/follow-ups` once on mount and lists up
 * to three stalled threads with a short suggested human action. Clicking an
 * item takes the provider to the existing detail page where they can decide
 * what to do — the card never sends messages, never spends credits, never
 * creates notifications.
 *
 * Renders nothing while loading, on error, or when there are no stalled
 * signals, so the dashboard stays calm.
 */
export default function ProviderFollowUpsCard() {
  const [items, setItems] = useState<FollowUpItem[] | null>(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/tiekejas/follow-ups", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : null))
      .then((payload: FollowUpsResponse | null) => {
        if (cancelled) return;
        if (payload?.success && payload.data) {
          setItems(payload.data.threads);
          setTotal(payload.data.totals.totalThreads);
        } else {
          setItems([]);
        }
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!items || items.length === 0) return null;

  const top = items.slice(0, 3);

  return (
    <Card className="mb-6 p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
            <BellRing className="h-4 w-4" />
          </div>
          <div>
            <CardTitle>Pokalbiai, kuriems verta priminti</CardTitle>
            <p className="text-micro text-surface-500 dark:text-surface-400">
              AI patarimas — pats nieko nesiunčia, jūs sprendžiate
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-lg bg-surface-100 px-2.5 py-1 text-caption font-semibold text-surface-600 dark:bg-surface-800 dark:text-surface-300">
          {total}
        </span>
      </div>

      <ul className="space-y-2">
        {top.map((item) => (
          <li key={`${item.type}-${item.id}`}>
            <Link
              href={item.href}
              className="group flex min-h-[44px] items-center gap-3 rounded-xl border border-surface-200/60 bg-surface-50/60 px-3 py-2.5 transition-colors hover:border-brand-200 dark:border-surface-700/50 dark:bg-surface-800/40 dark:hover:border-brand-800/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium text-surface-900 dark:text-surface-50">
                  {item.title}
                </p>
                <p className="truncate text-micro text-surface-500">
                  {item.actionLabel} · {item.daysSinceActivity} d. nuo paskutinės žinutės
                </p>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-surface-400 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </li>
        ))}
      </ul>

      {total > top.length && (
        <p className="mt-3 text-micro text-surface-500 dark:text-surface-400">
          Dar {total - top.length} signal(ai) inbox&apos;e ir užklausų sąraše.
        </p>
      )}
    </Card>
  );
}
