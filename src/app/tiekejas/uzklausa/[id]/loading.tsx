import Skeleton from "@/components/ui/Skeleton";

export default function TiekejasUzklausaDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <Skeleton className="mb-4 h-4 w-32" />

      <div className="rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <Skeleton className="h-7 w-2/3" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>

        <div className="mt-5 space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
            <Skeleton className="h-5 w-40" />
            <div className="mt-4 space-y-3">
              <Skeleton className="h-20 w-full rounded-lg" />
              <div className="flex justify-end gap-2">
                <Skeleton className="h-9 w-24 rounded-lg" />
                <Skeleton className="h-9 w-28 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
          <Skeleton className="h-5 w-28" />
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </div>
      </div>
    </div>
  );
}
