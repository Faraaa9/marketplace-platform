import {
  RequestHeaderSkeleton,
  RequestBodySkeleton,
  ProposalsSectionSkeleton,
} from "./skeletons";

export default function RequestTrackerLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <RequestHeaderSkeleton />
      <RequestBodySkeleton />
      <ProposalsSectionSkeleton />
    </div>
  );
}
