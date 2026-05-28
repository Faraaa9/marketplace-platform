import Skeleton from "@/components/ui/Skeleton";

/** Fallback for the provider dashboard profile-completeness bar. */
export function ProfileCompletenessSkeleton() {
  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-4 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="mb-2 flex items-center justify-between">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-10" />
      </div>
      <Skeleton className="mb-2 h-2 w-full rounded-full" />
      <Skeleton className="h-3 w-3/4" />
    </div>
  );
}
