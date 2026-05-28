import Skeleton from "@/components/ui/Skeleton";

// Status-tab widths mirror the real "Visos / Aktyvios / Laukia / Vykdomos /
// Uždarytos" pills. Literal class strings so Tailwind JIT can see them.
const TAB_WIDTHS = ["w-14", "w-20", "w-16", "w-24", "w-24"];

/**
 * Fallback for /paskyra/uzklausos. Mirrors the request-list layout (status
 * tabs + cards) so nothing shifts when the data streams in. Pass
 * `withHeader` for the outer gate boundary, where the role-derived header has
 * not painted yet — it reserves the title + "Nauja" row so the header lands
 * without pushing the list down.
 */
export default function MyRequestsListSkeleton({
  withHeader = false,
}: {
  withHeader?: boolean;
}) {
  return (
    <>
      {withHeader && (
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      )}

      <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
        {TAB_WIDTHS.map((w, i) => (
          <Skeleton key={i} className={`h-11 ${w} rounded-lg`} />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Skeleton className="h-5 w-24 rounded-lg" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="mt-3 flex items-center justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
