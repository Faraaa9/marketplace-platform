import Skeleton from "@/components/ui/Skeleton";

/**
 * Static loading shell for the V2 provider profile (/meistrai/[slug]).
 *
 * Under Cache Components (PPR) the whole profile renders inside a dynamic
 * <Suspense> hole; this skeleton is its fallback, so it's part of the
 * prerendered static shell and paints instantly while the data streams in.
 * It mirrors ProfileLayoutV2's structure (hero card + tabs, sticky sidebar,
 * full-width similar providers) so there's minimal layout shift on swap.
 */
export default function ProfileSkeletonV2() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-8">
        {/* "Visi meistrai" back link */}
        <Skeleton className="mb-[22px] h-4 w-28" />

        <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] md:items-start">
          {/* ── Left: hero card + tabs ── */}
          <div className="min-w-0">
            <div className="profile-card overflow-hidden bg-white dark:bg-surface-900">
              {/* Cover + avatar */}
              <div className="relative h-[300px] w-full">
                <Skeleton className="h-full w-full rounded-none" />
                <div className="absolute bottom-[26px] left-[26px] rounded-full bg-white p-[3px] shadow-md dark:bg-surface-900">
                  <Skeleton className="h-[72px] w-[72px] rounded-full" />
                </div>
              </div>

              {/* Identity */}
              <div className="px-6 pb-5 pt-4 sm:px-8">
                <Skeleton className="h-7 w-2/3" />
                <Skeleton className="mt-2 h-4 w-1/2" />
                <Skeleton className="mt-3 h-4 w-32" />
              </div>

              {/* Trust strip */}
              <div className="grid grid-cols-3 border-t border-surface-100 dark:border-surface-800">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`px-3 py-4 ${i > 0 ? "border-l border-surface-100 dark:border-surface-800" : ""}`}
                  >
                    <Skeleton className="mx-auto h-5 w-12" />
                    <Skeleton className="mx-auto mt-2 h-3 w-16" />
                  </div>
                ))}
              </div>

              {/* Tab bar */}
              <div className="border-t border-surface-100 p-3.5 dark:border-surface-800">
                <div className="flex gap-1.5 rounded-2xl bg-surface-50 p-1.5 dark:bg-surface-800/50">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-9 flex-1 rounded-xl" />
                  ))}
                </div>
              </div>
            </div>

            {/* Default tab panel: completed works gallery */}
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-2xl" />
              ))}
            </div>
          </div>

          {/* ── Right: sticky sidebar ── */}
          <div className="min-w-0 space-y-6 md:sticky md:top-24">
            {/* Inquiry / CTA card */}
            <div className="profile-card border border-surface-100 bg-white p-6 dark:border-surface-800 dark:bg-surface-900/50">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-3 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-2/3" />
              <Skeleton className="mt-4 h-11 w-full rounded-xl" />
              <Skeleton className="mt-2.5 h-11 w-full rounded-xl" />
              <Skeleton className="mt-3.5 h-3 w-40" />
            </div>

            {/* Quick facts card */}
            <div className="profile-card bg-white p-6 dark:bg-surface-900/50">
              <Skeleton className="h-3 w-24" />
              <div className="mt-3 space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-[30px] w-[30px] shrink-0 rounded-[9px]" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Full-width: similar providers ── */}
          <div className="min-w-0 md:col-span-2">
            <div className="rounded-3xl bg-white p-6 sm:p-8 dark:bg-surface-900/50">
              <Skeleton className="mb-4 h-6 w-44" />
              <div className="grid gap-3 sm:grid-cols-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-28 rounded-xl" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
