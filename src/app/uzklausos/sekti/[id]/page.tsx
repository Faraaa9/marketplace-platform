import { Suspense } from "react";
import { CheckCircle2 } from "lucide-react";
import RequestHeader from "./sections/RequestHeader";
import RequestBody from "./sections/RequestBody";
import ProposalsSection from "./sections/ProposalsSection";
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
      {created === "1" && <FreshlyCreatedBanner />}

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

function FreshlyCreatedBanner() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-200">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <div className="min-w-0 text-body-sm">
        <div className="font-semibold">Užklausa paskelbta.</div>
        <div className="text-emerald-800/90 dark:text-emerald-200/80">
          Pasiūlymus dažniausiai gauni per kelias valandas. Šį puslapį
          gali įsiminti — čia matysi visus tiekėjų atsakymus.
        </div>
      </div>
    </div>
  );
}
