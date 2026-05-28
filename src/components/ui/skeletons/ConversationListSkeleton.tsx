import Skeleton from "@/components/ui/Skeleton";

/**
 * Fallback for the provider inbox list (/tiekejas/zinutes). Mirrors the
 * conversation rows (unread dot + title + badge + snippet + timestamp) so the
 * streamed list lands without shifting.
 */
export function ConversationListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl border border-surface-200/60 bg-white p-4 dark:border-surface-700/50 dark:bg-surface-900/50 sm:p-5"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-32 flex-1" />
                <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
              </div>
              <Skeleton className="h-3 w-48" />
              <Skeleton className="h-3 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
