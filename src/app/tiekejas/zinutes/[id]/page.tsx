import { Suspense } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import ProviderInquiryDetailClient from "./IdClient";

// Server shell — the actual UI is a "use client" component below that uses
// useParams/useSession/useSearchParams hooks. Cache Components requires
// those to live inside a server-rendered Suspense boundary.
export default function ProviderInquiryDetailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ProviderInquiryDetailClient />
    </Suspense>
  );
}
