import { Suspense } from "react";
import RequestHeader from "./sections/RequestHeader";
import RequestBody from "./sections/RequestBody";
import ProposalsSection from "./sections/ProposalsSection";
import CreatedToast from "./components/CreatedToast";
import {
  RequestHeaderSkeleton,
  RequestBodySkeleton,
  ProposalsSectionSkeleton,
} from "./skeletons";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ verification?: string; delivery?: string; created?: string }>;
}

/**
 * Public request tracker. The route param `[id]` is the request's tracking
 * token. The page is a static shell (no SessionGate — viewable by the owner or
 * anyone with the token); each section fetches by token on its own Suspense
 * boundary so the header paints first and the slow proposals stream last.
 * Session-dependent UI is the `<ViewerBanner>` client island inside RequestBody.
 */
export default async function TrackRequestPage({ params, searchParams }: PageProps) {
  const { created } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {created === "1" && <CreatedToast />}

      <Suspense fallback={<RequestHeaderSkeleton />}>
        <RequestHeader params={params} searchParams={searchParams} />
      </Suspense>

      <Suspense fallback={<RequestBodySkeleton />}>
        <RequestBody params={params} />
      </Suspense>

      <Suspense fallback={<ProposalsSectionSkeleton />}>
        <ProposalsSection params={params} />
      </Suspense>
    </div>
  );
}
