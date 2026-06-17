import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SessionGate } from "@/components/auth/SessionGate";
import { AnnouncementCards } from "@/components/announcements/AnnouncementCards";
import Button from "@/components/ui/Button";
import { MyRequestsListSkeleton } from "@/components/ui/skeletons";
import MyRequestsList from "./MyRequestsList";

export const metadata: Metadata = {
  title: "Mano užklausos | PaslaugųRinka",
  description: "Jūsų pateiktos užklausos ir gauti pasiūlymai.",
};

interface PageProps {
  searchParams: Promise<{ status?: string; created?: string }>;
}

// Cache Components: the shell prerenders, then the auth gate streams in. Both
// USER and PROVIDER may view this page — only the title and the role toggle
// differ — so the gate runs auth-only (no requireRole) and the role is read
// for the header. The request list streams on its own inner boundary.
export default function MyRequestsPage({ searchParams }: PageProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <Suspense fallback={<MyRequestsListSkeleton withHeader />}>
          <SessionGate callbackUrl="/paskyra/uzklausos">
            {(userId) => (
              <MyRequestsView userId={userId} searchParams={searchParams} />
            )}
          </SessionGate>
        </Suspense>
      </div>
    </div>
  );
}

async function MyRequestsView({
  userId,
  searchParams,
}: {
  userId: string;
  searchParams: Promise<{ status?: string; created?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const isProvider = session?.user?.role === "PROVIDER";

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">
          {isProvider ? "Mano pateiktos užklausos" : "Mano užklausos"}
        </h1>
        <Link href="/uzklausos/nauja">
          <Button size="sm">
            <Plus className="mr-1 h-4 w-4" /> Nauja
          </Button>
        </Link>
      </div>

      <AnnouncementCards surface="client" className="mb-5" />

      {isProvider && (
        <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
          <Link
            href="/uzklausos"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-lg px-3 text-body-sm font-medium text-surface-500 transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 sm:flex-none"
          >
            Klientų
          </Link>
          <span
            aria-current="page"
            className="inline-flex min-h-[44px] flex-1 items-center justify-center whitespace-nowrap rounded-lg bg-white px-3 text-body-sm font-semibold text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white sm:flex-none"
          >
            Mano pateiktos
          </span>
        </div>
      )}

      <Suspense fallback={<MyRequestsListSkeleton />}>
        <MyRequestsList userId={userId} searchParams={searchParams} />
      </Suspense>
    </>
  );
}
