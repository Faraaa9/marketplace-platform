import { Suspense } from "react";
import Skeleton from "@/components/ui/Skeleton";
import TrackRequestClient from "./TrackRequestClient";

export const dynamic = "force-dynamic";

export default function TrackRequestPage() {
  return (
    <Suspense fallback={<TrackRequestSkeleton />}>
      <TrackRequestClient />
    </Suspense>
  );
}

function TrackRequestSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
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
      </div>

      <Skeleton className="mb-6 h-16 w-full rounded-2xl" />

      <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-4/5" />
        </div>
      </div>

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
