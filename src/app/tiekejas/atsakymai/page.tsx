import { Suspense } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import AtsakymaiClient from "./AtsakymaiClient";

// Server shell — the client component below uses useSearchParams() which
// Cache Components requires to live inside a server-rendered Suspense.
export default function ProviderResponsesPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AtsakymaiClient />
    </Suspense>
  );
}
