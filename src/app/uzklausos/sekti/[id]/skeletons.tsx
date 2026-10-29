import Skeleton from "@/components/ui/Skeleton";

// Per-section skeletons for the request page; shapes mirror the real sections
// (header, offer grid, side panel) so streamed content lands without shift.

export function RequestHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-32 rounded-full" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-6 w-full" />
    </div>
  );
}

export function RequestBodySkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-32 w-full rounded-xl" />
    </div>
  );
}

export function ProposalsSectionSkeleton() {
  return (
    <div>
      <Skeleton className="mb-3 h-6 w-40" />
      <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-56 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
