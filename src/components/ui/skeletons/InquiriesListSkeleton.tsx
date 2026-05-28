import Skeleton from "@/components/ui/Skeleton";

/**
 * Fallback for /paskyra/zinutes. The gate streams the whole view, so this
 * mirrors its full layout — breadcrumb, header, the two filter tabs, and the
 * conversation rows (avatar + name + preview + timestamp). Distinct from the
 * provider ConversationListSkeleton: rows here lead with a provider avatar,
 * not an unread dot.
 */
export default function InquiriesListSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Skeleton className="mb-6 h-4 w-20" />

      <div className="mb-6 space-y-2">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>

      <div className="mb-6 flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
        <Skeleton className="h-11 flex-1 rounded-lg" />
        <Skeleton className="h-11 flex-1 rounded-lg" />
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <article
            key={i}
            className="rounded-2xl border border-surface-200/60 bg-white p-4 sm:p-5 dark:border-surface-700/50 dark:bg-surface-900/50"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="mt-0.5 h-4 w-4 shrink-0" />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
