import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SessionGate } from "@/components/auth/SessionGate";
import { ConversationListSkeleton } from "@/components/ui/skeletons";
import { ConversationList } from "./ConversationList";
import { InboxFilterShell, InboxTabsBar } from "./InboxFilterShell";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

// Static chrome (breadcrumb + title) paints with the shell. The filter bar is a
// client island that stays usable while the conversation list streams in its
// own boundary (single fetch -> one data Suspense).
export default function ProviderInboxPage({ searchParams }: PageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/tiekejas"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Valdymo panelė
      </Link>

      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Žinutės
        </h1>
      </div>

      <Suspense fallback={<InboxTabsBar active="all" />}>
        <InboxFilterShell />
      </Suspense>

      <Suspense fallback={<ConversationListSkeleton />}>
        <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/zinutes">
          {(userId) => (
            <ConversationList userId={userId} searchParams={searchParams} />
          )}
        </SessionGate>
      </Suspense>
    </div>
  );
}
