import { Suspense } from "react";
import Skeleton from "@/components/ui/Skeleton";
import RequestsListClient from "./RequestsListClient";

export const dynamic = "force-dynamic";

export default function ProviderRequestsPage() {
  return (
    <Suspense fallback={<RequestsListSkeleton />}>
      <RequestsListClient />
    </Suspense>
  );
}

function RequestsListSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 sm:py-8">
        <div className="mb-5 flex items-center justify-between gap-3">
          <Skeleton className="h-7 w-28" />
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-24 rounded-lg" />
            <Skeleton className="h-8 w-32 rounded-lg" />
          </div>
        </div>

        <Skeleton className="mb-5 h-11 w-full rounded-xl" />

        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-11 flex-1 rounded-xl" />
          <Skeleton className="h-11 w-24 rounded-xl" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900"
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Skeleton className="h-6 w-20 rounded-lg" />
                  <Skeleton className="h-6 w-14 rounded-lg" />
                </div>
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="mt-2 h-3 w-full" />
              <Skeleton className="mt-1 h-3 w-5/6" />
              <div className="mt-3 flex items-center justify-between pt-3 border-t border-surface-100 dark:border-surface-800">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
