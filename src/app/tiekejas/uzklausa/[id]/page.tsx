import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SessionGate } from "@/components/auth/SessionGate";
import { RequestHeader, RequestHeaderSkeleton } from "./sections/RequestHeader";
import { RequestBody, RequestBodySkeleton } from "./sections/RequestBody";
import { ResponseSection, ResponseSectionSkeleton } from "./sections/ResponseSection";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProviderRequestDetailPage({ params }: PageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Static back link — paints with the prerendered shell, outside the gate. */}
      <Link
        href="/uzklausos"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti į užklausas
      </Link>

      {/* Gate is async (reads the session — dynamic under cacheComponents), so it
          lives inside a Suspense. It redirects unauthorized / non-PROVIDER users
          before any section streams, so they never see partial UI. */}
      <Suspense fallback={null}>
        <SessionGate requireRole="PROVIDER" callbackUrl="/uzklausos">
          {() => (
            <>
              {/* Header → body → response stream in reading order; each section
                  reads the request independently so a slow query never blocks
                  the ones above it. */}
              <Suspense fallback={<RequestHeaderSkeleton />}>
                <RequestHeader params={params} />
              </Suspense>

              <Suspense fallback={<RequestBodySkeleton />}>
                <RequestBody params={params} />
              </Suspense>

              <Suspense fallback={<ResponseSectionSkeleton />}>
                <ResponseSection params={params} />
              </Suspense>
            </>
          )}
        </SessionGate>
      </Suspense>
    </div>
  );
}
