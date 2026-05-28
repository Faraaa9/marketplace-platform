import { Suspense } from "react";
import { SessionGate } from "@/components/auth/SessionGate";
import { ResponsesListSkeleton } from "@/components/ui/skeletons";
import { ResponsesList } from "./ResponsesList";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

// Static header paints with the prerendered shell; the gate + response list
// stream in under a layout-matching skeleton (single fetch -> one boundary).
export default function ProviderResponsesPage({ searchParams }: PageProps) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Mano atsakymai
        </h1>
        <p className="mt-1 text-body text-surface-500 dark:text-surface-400">
          Užklausos, į kurias atsakėte, ir kiekvieno pasiūlymo būsena.
        </p>
      </div>

      <Suspense fallback={<ResponsesListSkeleton />}>
        <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/atsakymai">
          {(userId) => (
            <ResponsesList userId={userId} searchParams={searchParams} />
          )}
        </SessionGate>
      </Suspense>
    </div>
  );
}
