import Skeleton from "@/components/ui/Skeleton";

/**
 * Fallback for the provider inbox list (/tiekejas/zinutes). Mirrors the
 * conversation rows (unread dot + title + badge + snippet + timestamp) so the
 * streamed list lands without shifting.
 */
export function ConversationListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-[#EFECE6] bg-white p-3 dark:border-surface-700/50 dark:bg-surface-900/50"
        >
          <div className="flex items-start gap-3.5">
            <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2 pt-1">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
