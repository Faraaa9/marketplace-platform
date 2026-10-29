import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SessionGate } from "@/components/auth/SessionGate";
import CreatedToast from "@/components/ui/CreatedToast";
import { MyRequestsListSkeleton } from "@/components/ui/skeletons";
import { ButtonLink, Chip, EmptyPanel, PageHeader, Tabs } from "@/components/account/ui";
import { getCustomerOverview, offersLabel } from "@/lib/account/customer-data";
import { requestStatusChip } from "@/lib/account/request-progress";
import { formatRelativeDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mano užklausos",
  description: "Jūsų pateiktos užklausos ir gauti pasiūlymai.",
};

type SearchParams = Promise<{ tab?: string; status?: string; created?: string }>;

export default function MyRequestsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Mano užklausos"
        sub="Visos jūsų užklausos vienoje vietoje."
        actions={
          <ButtonLink href="/uzklausos/nauja" variant="primary">
            + Nauja užklausa
          </ButtonLink>
        }
      />
      <Suspense fallback={<MyRequestsListSkeleton />}>
        <SessionGate callbackUrl="/paskyra/uzklausos">
          {(userId) => <MyRequestsView userId={userId} searchParams={searchParams} />}
        </SessionGate>
      </Suspense>
    </div>
  );
}

async function MyRequestsView({ userId, searchParams }: { userId: string; searchParams: SearchParams }) {
  const sp = await searchParams;
  // `?status=CLOSED` is the pre-redesign filter param; old links keep working.
  const showClosed = sp.tab === "uzbaigtos" || sp.status === "CLOSED";
  const { active, closed } = await getCustomerOverview(userId);
  const list = showClosed ? closed : active;

  return (
    <div>
      {sp.created === "1" && <CreatedToast />}
      <Tabs
        items={[
          { href: "/paskyra/uzklausos", label: `Aktyvios (${active.length})`, active: !showClosed },
          { href: "/paskyra/uzklausos?tab=uzbaigtos", label: `Užbaigtos (${closed.length})`, active: showClosed },
        ]}
      />
      <div className="mt-4 flex flex-col gap-2.5">
        {list.length === 0 ? (
          <EmptyPanel>
            {showClosed ? (
              "Užbaigtų užklausų dar nėra."
            ) : (
              <>
                Aktyvių užklausų nėra.{" "}
                <Link href="/uzklausos/nauja" className="font-semibold text-brand-700 hover:underline">
                  Pateikti užklausą
                </Link>
              </>
            )}
          </EmptyPanel>
        ) : (
          list.map((r) => {
            const chip = requestStatusChip(r);
            return (
              <Link
                key={r.id}
                href={`/uzklausos/sekti/${r.trackingToken}`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border border-surface-100 bg-white px-4 py-3.5 transition-colors hover:border-surface-300 dark:border-surface-800 dark:bg-surface-900"
              >
                <div className="min-w-0 flex-[1_1_260px]">
                  <p className="truncate text-body font-semibold text-surface-900 dark:text-white">{r.title}</p>
                  <p className="text-caption font-normal text-surface-500">
                    {[r.location, r.categoryName, formatRelativeDate(r.createdAt)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <span className="text-caption font-normal text-surface-500">{offersLabel(r.responseCount)}</span>
                <Chip tone={chip.tone}>{chip.label}</Chip>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
