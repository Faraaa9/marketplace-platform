import { Suspense } from "react";
import RequestHeader from "./sections/RequestHeader";
import RequestBody from "./sections/RequestBody";
import ProposalsSection from "./sections/ProposalsSection";
import CreatedToast from "@/components/ui/CreatedToast";
import { RequestHeaderSkeleton, RequestBodySkeleton, ProposalsSectionSkeleton } from "./skeletons";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ verification?: string; delivery?: string; created?: string }>;
}

/**
 * Request page. The route param `[id]` is the request's tracking token, so the
 * page works for the signed-in owner (inside the account shell) and for a
 * guest holding the emailed link. Each section fetches by token on its own
 * Suspense boundary: header first, side details next, proposals stream last.
 */
export default async function TrackRequestPage({ params, searchParams }: PageProps) {
  const { created } = await searchParams;
  return (
    <div className="flex flex-col gap-5">
      {created === "1" && <CreatedToast />}

      <Suspense fallback={<RequestHeaderSkeleton />}>
        <RequestHeader params={params} searchParams={searchParams} />
      </Suspense>

      <div className="flex flex-wrap items-start gap-5">
        <section className="flex min-w-0 flex-[999_1_520px] flex-col gap-3">
          <Suspense fallback={<ProposalsSectionSkeleton />}>
            <ProposalsSection params={params} />
          </Suspense>
        </section>
        <aside className="min-w-0 flex-[1_1_280px]">
          <Suspense fallback={<RequestBodySkeleton />}>
            <RequestBody params={params} />
          </Suspense>
        </aside>
      </div>
    </div>
  );
}
