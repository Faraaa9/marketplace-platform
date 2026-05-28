import { Suspense } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import InquiryConversationClient from "./TokenClient";

// Server shell — the actual UI is a "use client" component below.
// Cache Components requires hooks like useParams/useSession to live inside
// a server-rendered Suspense boundary.
export default function InquiryConversationPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <InquiryConversationClient />
    </Suspense>
  );
}
