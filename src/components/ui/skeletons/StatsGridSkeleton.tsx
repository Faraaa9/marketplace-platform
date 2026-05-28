import Skeleton from "@/components/ui/Skeleton";

/** Fallback for the provider dashboard stats grid (4 metric tiles). */
export function StatsGridSkeleton() {
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-11 w-11 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
