"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { getGuestRequest, clearGuestRequest } from "@/lib/guest-request";
import { ArrowRight, X, FileText } from "lucide-react";

export default function RecentRequestBanner() {
  const { data: session } = useSession();
  const [request, setRequest] = useState<{ token: string; title: string } | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Don't show for logged-in users — they have "Mano užklausos"
    if (session) {
      setRequest(null);
      return;
    }

    const saved = getGuestRequest();
    if (!saved) {
      setRequest(null);
      return;
    }

    // Only show the banner for true guest requests. If the request has already
    // been attached to an account, clear the stale local recovery token.
    fetch(`/api/requests/${saved.token}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success && !data.data?.clientId) {
          setRequest(saved);
        } else {
          clearGuestRequest();
          setRequest(null);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setRequest(null);
      });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (!request || dismissed || session) return null;

  function handleDismiss() {
    clearGuestRequest();
    setDismissed(true);
  }

  return (
    <div className="rounded-2xl border border-brand-200/60 bg-brand-50/50 p-4 dark:border-brand-800/40 dark:bg-brand-950/30">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-900/50">
          <FileText className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-body-sm font-medium text-surface-900 dark:text-white">
            Turite neseniai pateiktą užklausą
          </p>
          <p className="text-micro text-surface-500 dark:text-surface-400 mt-0.5 truncate">
            "{request.title}"
          </p>
          <Link
            href={`/uzklausos/sekti/${request.token}`}
            className="mt-2 inline-flex items-center gap-1.5 text-body-sm font-medium text-brand-600 hover:text-brand-700 transition-colors dark:text-brand-400 dark:hover:text-brand-300"
          >
            Tęsti sekimą
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-surface-400 hover:text-surface-600 hover:bg-surface-200/50 transition-colors dark:hover:text-surface-300 dark:hover:bg-surface-800/50"
          aria-label="Uždaryti"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
