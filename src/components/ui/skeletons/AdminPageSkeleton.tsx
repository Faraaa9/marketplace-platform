import Skeleton from "@/components/ui/Skeleton";

/** Generic instant fallback for /admin/* route transitions. Mirrors the shared
 *  admin content padding + title, then a toolbar and a few data rows. Transient
 *  (shows only during the page's JS/RSC fetch), so one shape covers tables,
 *  dashboards, and forms without per-page tailoring. */
export function AdminPageSkeleton() {
  return (
    <div className="p-6 lg:p-8">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-2 h-4 w-72 max-w-full" />

      <div className="mt-8 flex flex-wrap gap-2">
        <Skeleton className="h-10 w-64 max-w-full rounded-lg" />
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>

      <div className="mt-6 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
