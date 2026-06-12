import Skeleton from "@/components/ui/Skeleton";

/**
 * Fallback for a provider direct-inquiry thread (/tiekejas/zinutes/[id]).
 * Mirrors the header, contact card, and conversation card (avatar header +
 * message rows + input bar) so the streamed thread drops in without shifting.
 */
export function ThreadViewSkeleton() {
  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Skeleton className="h-6 w-32 rounded-full" />
        <Skeleton className="mt-2 h-8 w-48" />
        <Skeleton className="mt-1 h-4 w-24" />
      </div>

      {/* Contact card */}
      <div className="mb-6 rounded-2xl border border-surface-0 bg-white p-6 shadow-lg dark:border-surface-700/50 dark:bg-surface-900/50">
        <Skeleton className="mb-3 h-3 w-20" />
        <div className="flex flex-wrap gap-4">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>

      {/* Conversation card */}
      <div className="rounded-2xl border border-surface-0 bg-white p-6 shadow-lg dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="mb-4 flex items-center gap-3 border-b border-surface-0 pb-4 dark:border-surface-700">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-12 w-3/4 rounded-xl" />
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-12 w-full rounded-xl" />
      </div>
    </div>
  );
}
