import Skeleton from "@/components/ui/Skeleton";

/**
 * Per-section skeletons for the request tracker. Shapes mirror the real
 * sections (max-w-3xl, single column) so streamed content lands without
 * layout shift. Shared by the page's Suspense fallbacks and loading.tsx.
 */

export function RequestHeaderSkeleton() {
  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <Skeleton className="h-4 w-40" />
        </div>
        <Skeleton className="h-11 w-11 rounded-full" />
      </div>
      <Skeleton className="h-9 w-3/4" />
      <div className="mt-3 flex flex-wrap gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
      {/* Status timeline card */}
      <Skeleton className="mt-6 h-24 w-full rounded-2xl" />
    </div>
  );
}

export function RequestBodySkeleton() {
  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  );
}

export function ProposalsSectionSkeleton() {
  return (
    <div>
      <Skeleton className="mb-4 h-7 w-40" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-surface-200/60 bg-white p-5 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-5/6" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
