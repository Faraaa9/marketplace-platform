import Skeleton from "@/components/ui/Skeleton";

/**
 * Fallback for the provider "Mano atsakymai" list (/tiekejas/atsakymai).
 * Mirrors the status-tab bar + response cards so nothing shifts when the
 * streamed list replaces it.
 */
export function ResponsesListSkeleton() {
  return (
    <div>
      {/* Status tabs */}
      <div className="mb-5 flex flex-wrap gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-24 rounded-lg" />
        ))}
      </div>

      {/* Response rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <Skeleton className="h-6 w-24 rounded-lg" />
              <Skeleton className="h-6 w-28 rounded-lg" />
            </div>
            <Skeleton className="h-5 w-2/3" />
            <div className="mt-3 flex items-center justify-between gap-3 border-t border-surface-100 pt-3 dark:border-surface-800">
              <div className="flex flex-wrap items-center gap-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
