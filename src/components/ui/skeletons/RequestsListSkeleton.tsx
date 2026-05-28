import Skeleton from "@/components/ui/Skeleton";

/**
 * Fallback for the provider request-list boundary. Mirrors the cards area only
 * — the header, search and filter chrome render immediately from the client
 * filter shell, so they are not part of this skeleton (no duplicated chrome).
 */
export function RequestsListSkeleton() {
  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Skeleton className="h-3 w-16" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-6 w-20 rounded-lg" />
                <Skeleton className="h-6 w-14 rounded-lg" />
              </div>
              <Skeleton className="h-6 w-16 rounded-lg" />
            </div>
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="mt-2 h-3 w-full" />
            <Skeleton className="mt-1 h-3 w-5/6" />
            <div className="mt-3 flex items-center justify-between border-t border-surface-100 pt-3 dark:border-surface-800">
              <div className="flex items-center gap-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
