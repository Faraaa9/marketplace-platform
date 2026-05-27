import { Sparkles } from "lucide-react";

/** Skeleton card shown while the v2 page waits for /api/requests/improve to
 *  return on first mount. Mirrors the rough shape of InlineListingCard so the
 *  layout doesn't jump when the real content arrives. */
export default function AiProcessingSkeleton() {
  return (
    <div className="mt-6 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="flex items-center gap-2 text-body-sm font-medium text-brand-600 dark:text-brand-300">
        <Sparkles className="h-4 w-4 animate-pulse" />
        <span>AI ruošia tavo skelbimą…</span>
      </div>

      <div className="mt-5 space-y-3">
        <div className="h-6 w-2/3 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-3 w-11/12 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        <div className="h-3 w-3/4 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        <div className="h-8 w-32 animate-pulse rounded-full bg-surface-100 dark:bg-surface-800" />
        <div className="h-8 w-24 animate-pulse rounded-full bg-surface-100 dark:bg-surface-800" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-surface-100 dark:bg-surface-800" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-surface-100 dark:bg-surface-800" />
      </div>
    </div>
  );
}
