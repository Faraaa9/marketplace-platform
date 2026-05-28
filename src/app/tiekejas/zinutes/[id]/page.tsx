import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SessionGate } from "@/components/auth/SessionGate";
import { ThreadViewSkeleton } from "@/components/ui/skeletons";
import { ThreadView } from "./ThreadView";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Static back link paints with the shell; the gate + thread stream in under a
// layout-matching skeleton (single fetch -> one boundary).
export default function ProviderInquiryDetailPage({ params }: PageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/tiekejas/zinutes"
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti į žinutes
      </Link>

      <Suspense fallback={<ThreadViewSkeleton />}>
        <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/zinutes">
          {(userId) => <ThreadView params={params} userId={userId} />}
        </SessionGate>
      </Suspense>
    </div>
  );
}
