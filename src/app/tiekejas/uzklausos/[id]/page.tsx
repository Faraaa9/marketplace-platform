import { Suspense } from "react";
import Skeleton from "@/components/ui/Skeleton";
import RequestDetailClient from "./RequestDetailClient";


export default function ProviderRequestDetailPage() {
  return (
    <Suspense fallback={<RequestDetailSkeleton />}>
      <RequestDetailClient />
    </Suspense>
  );
}

function RequestDetailSkeleton() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Skeleton className="mb-4 h-4 w-40" />

      <div className="mb-6">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-24 rounded-lg" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
        <Skeleton className="mt-3 h-9 w-3/4" />
        <div className="mt-3 flex flex-wrap gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="space-y-2">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-11/12" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <div className="mt-4 border-t border-surface-200/50 dark:border-surface-700 pt-3 flex flex-wrap gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>

      <Skeleton className="mb-4 h-7 w-48" />
      <div className="space-y-4">
        <div className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="mt-3 flex justify-end">
            <Skeleton className="h-10 w-3/5 rounded-2xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
