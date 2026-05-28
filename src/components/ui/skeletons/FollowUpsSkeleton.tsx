import Skeleton from "@/components/ui/Skeleton";

/** Fallback for the provider dashboard follow-ups (Follow-Up Agent) card. */
export function FollowUpsSkeleton() {
  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="mb-4 flex items-center gap-2">
        <Skeleton className="h-9 w-9 rounded-xl" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-40" />
        </div>
      </div>
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 rounded-xl border border-surface-200/60 bg-surface-50/60 px-3 py-2.5 dark:border-surface-700/50 dark:bg-surface-800/40"
          >
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-4 w-4 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
