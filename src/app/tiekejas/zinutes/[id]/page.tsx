import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { SessionGate } from "@/components/auth/SessionGate";
import { ConversationListSkeleton, ThreadViewSkeleton } from "@/components/ui/skeletons";
import { ConversationList } from "../ConversationList";
import { ThreadView } from "./ThreadView";

interface PageProps {
  params: Promise<{ id: string }>;
}

// Static back link paints with the shell; the gate + thread stream in under a
// layout-matching skeleton (single fetch -> one boundary).
export default function ProviderInquiryDetailPage({ params }: PageProps) {
  return (
    <div className="mx-auto -mb-[calc(3.5rem+env(safe-area-inset-bottom))] max-w-7xl bg-[#fcfbf8] px-4 py-4 md:mb-0 md:py-6">
      <div className="overflow-hidden rounded-2xl border border-[#ece9e2] bg-white shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:border-surface-700/60 dark:bg-surface-900/70">
        <div className="grid h-[calc(100dvh-6.5rem)] min-h-[560px] lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-[#ece9e2] bg-white dark:border-surface-700/60 dark:bg-surface-900 lg:flex lg:flex-col">
            <div className="flex min-h-[72px] items-center justify-between border-b border-[#ece9e2] bg-white px-5 dark:border-surface-700/60">
              <div>
                <p className="text-body font-semibold text-[#1E1B18] dark:text-white">Visos žinutės</p>
                <Link href="/tiekejas" className="text-micro text-[#6B6760] hover:text-[#1E1B18]">
                  Valdymo panelė
                </Link>
              </div>
              <button className="grid min-h-11 min-w-11 place-items-center rounded-xl border border-[#ece9e2] bg-white text-[#6B6760] hover:bg-[#faeee7] hover:text-[#1E1B18] dark:hover:bg-surface-800" aria-label="Ieškoti">
                <Search className="h-5 w-5" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <Suspense fallback={<ConversationListSkeleton />}>
                <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/zinutes">
                  {(userId) => (
                    <ConversationList
                      userId={userId}
                      searchParams={Promise.resolve({})}
                      compact
                    />
                  )}
                </SessionGate>
              </Suspense>
            </div>
          </aside>

          <main className="min-h-0 min-w-0 bg-[#fcfbf8] dark:bg-surface-900">
            <Link
              href="/tiekejas/zinutes"
              className="flex min-h-12 items-center gap-1.5 border-b border-[#ece9e2] bg-white px-4 text-body-sm text-[#6B6760] transition-colors hover:text-[#1E1B18] dark:border-surface-700/60 dark:text-surface-400 dark:hover:text-surface-200 lg:hidden"
            >
              <ArrowLeft className="h-4 w-4" />
              Grįžti į žinutes
            </Link>

            <Suspense fallback={<ThreadViewSkeleton />}>
              <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/zinutes">
                {(userId) => <ThreadView params={params} userId={userId} inboxLayout />}
              </SessionGate>
            </Suspense>
          </main>
        </div>
      </div>
    </div>
  );
}
