import Skeleton from "@/components/ui/Skeleton";

/**
 * Suspense fallback for the provider dashboard. Mirrors the ProviderWorkCenter
 * shell (header + 4 summary tiles + main panel/aside) at matching dimensions so
 * the page paints instantly and there is no layout shift when real data lands.
 */
export function ProviderWorkCenterSkeleton() {
  return (
    <div aria-hidden>
      <header className="mb-6 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <Skeleton className="h-3 w-40" />
          <Skeleton className="mt-3 h-12 w-72 max-w-full sm:h-14" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-11 w-40 rounded-xl" />
          <Skeleton className="h-11 w-32 rounded-xl" />
        </div>
      </header>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="min-h-[88px] rounded-2xl border border-surface-200/70 bg-white/80 px-4 py-3.5 dark:border-surface-700 dark:bg-surface-900"
          >
            <Skeleton className="h-7 w-16" />
            <Skeleton className="mt-3 h-3 w-24" />
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.55fr)_minmax(310px,0.75fr)]">
        <section className="overflow-hidden rounded-2xl border border-surface-200/70 bg-white dark:border-surface-700 dark:bg-surface-900">
          <div className="flex items-center justify-between border-b border-surface-200/70 px-5 py-4 dark:border-surface-700">
            <div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-3 w-56 max-w-full" />
            </div>
            <Skeleton className="h-8 w-40 rounded-full" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="grid min-h-[96px] grid-cols-[48px_minmax(0,1fr)] items-center gap-4 border-b border-surface-200/60 px-5 py-3.5 last:border-b-0 dark:border-surface-700"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </section>

        <aside className="grid gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-surface-200/70 bg-white p-5 dark:border-surface-700 dark:bg-surface-900"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-5/6" />
              <div className="mt-4 flex gap-2">
                <Skeleton className="h-8 w-24 rounded-lg" />
                <Skeleton className="h-8 w-20 rounded-lg" />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
