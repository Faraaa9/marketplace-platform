import { RequestHeaderSkeleton, RequestBodySkeleton, ProposalsSectionSkeleton } from "./skeletons";

export default function RequestTrackerLoading() {
  return (
    <div className="flex flex-col gap-5">
      <RequestHeaderSkeleton />
      <div className="flex flex-wrap items-start gap-5">
        <div className="min-w-0 flex-[999_1_520px]">
          <ProposalsSectionSkeleton />
        </div>
        <div className="min-w-0 flex-[1_1_280px]">
          <RequestBodySkeleton />
        </div>
      </div>
    </div>
  );
}
