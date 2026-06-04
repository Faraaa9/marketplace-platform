import Skeleton from "@/components/ui/Skeleton";

/** Fallback for the provider dashboard profile-completeness bar. */
export function ProfileCompletenessSkeleton() {
  return (
    <div className="h-full rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-56" />
        </div>
        <Skeleton className="h-6 w-12 rounded-lg" />
      </div>
      <Skeleton className="mb-3 h-2 w-full rounded-full" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
