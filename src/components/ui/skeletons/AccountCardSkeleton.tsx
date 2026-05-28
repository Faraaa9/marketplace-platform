import Skeleton from "@/components/ui/Skeleton";

/** Fallback for the provider dashboard account card (avatar + name/email + badge). */
export function AccountCardSkeleton() {
  return (
    <div className="mb-4 rounded-xl border border-surface-200/60 bg-white px-4 py-3.5 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="flex items-center gap-3">
        <Skeleton className="h-11 w-11 rounded-full" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-6 w-24 rounded-lg" />
      </div>
    </div>
  );
}
