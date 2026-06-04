import Skeleton from "@/components/ui/Skeleton";

/** Fallback for the provider dashboard stats grid (4 metric tiles). */
export function StatsGridSkeleton() {
  return (
    <div className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <div className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50 sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-4 w-full max-w-lg" />
          </div>
          <Skeleton className="h-11 w-36 rounded-xl" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-surface-200/70 bg-surface-50/70 p-3 dark:border-surface-700/50 dark:bg-surface-800/30"
            >
              <Skeleton className="mb-3 h-9 w-9 rounded-lg" />
              <Skeleton className="h-6 w-10" />
              <Skeleton className="mt-1 h-3 w-16" />
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="mb-4 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-surface-200/70 bg-surface-50/70 px-3 py-3 dark:border-surface-700/50 dark:bg-surface-800/30"
            >
              <Skeleton className="mb-2 h-5 w-24 rounded-lg" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-3 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
