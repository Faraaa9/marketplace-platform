import { Suspense } from "react";
import { SessionGate } from "@/components/auth/SessionGate";
import {
  CreditBadgeSkeleton,
  RequestsListSkeleton,
} from "@/components/ui/skeletons";
import RequestsFilterShell from "./RequestsFilterShell";
import { CreditBadge } from "./sections/CreditBadge";
import { RequestsList } from "./sections/RequestsList";

interface PageProps {
  searchParams: Promise<{
    page?: string;
    category?: string;
    location?: string;
    search?: string;
    sort?: string;
  }>;
}

export default function ProviderRequestsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={null}>
      <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/uzklausos">
        {(userId) => (
          <RequestsFilterShell
            creditBadge={
              <Suspense fallback={<CreditBadgeSkeleton />}>
                <CreditBadge userId={userId} />
              </Suspense>
            }
          >
            <Suspense fallback={<RequestsListSkeleton />}>
              <RequestsList userId={userId} searchParams={searchParams} />
            </Suspense>
          </RequestsFilterShell>
        )}
      </SessionGate>
    </Suspense>
  );
}
