import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SessionGate } from "@/components/auth/SessionGate";
import Skeleton from "@/components/ui/Skeleton";
import { AnnouncementCards } from "@/components/announcements/AnnouncementCards";
import { AttentionList, ButtonLink, Chip, EmptyPanel, PageHeader, Panel, PanelTitle, StepBar } from "@/components/account/ui";
import { getCustomerOverview, offersLabel, type CustomerRequestRow } from "@/lib/account/customer-data";
import { requestStatusChip, requestStep } from "@/lib/account/request-progress";
import { formatRelativeDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Mano paskyra",
  description: "Jūsų užklausos, pasiūlymai ir žinutės vienoje vietoje.",
};

export default function CustomerHomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <SessionGate callbackUrl="/paskyra">{(userId) => <CustomerHome userId={userId} />}</SessionGate>
    </Suspense>
  );
}

async function CustomerHome({ userId }: { userId: string }) {
  const { firstName, active, attention } = await getCustomerOverview(userId);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={firstName ? `Labas, ${firstName}` : "Labas"}
        sub="Čia matote, kas vyksta su jūsų užklausomis ir ką reikia padaryti."
      />

      <AnnouncementCards surface="client" />

      <Panel>
        <PanelTitle aside={<span className="text-caption font-normal text-surface-500">{attention.length}</span>}>
          Reikia jūsų dėmesio
        </PanelTitle>
        <AttentionList items={attention} empty="Šiuo metu nieko nereikia — pranešime, kai atsiras naujų pasiūlymų ar žinučių." />
      </Panel>

      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-[15px] font-semibold">Aktyvios užklausos</h2>
          <ButtonLink href="/paskyra/uzklausos">Visos užklausos</ButtonLink>
        </div>
        {active.length === 0 ? (
          <EmptyPanel>
            Aktyvių užklausų nėra.{" "}
            <Link href="/uzklausos/nauja" className="font-semibold text-brand-700 hover:underline">
              Pateikite naują užklausą
            </Link>{" "}
            — meistrai atsiųs pasiūlymus.
          </EmptyPanel>
        ) : (
          <div className="grid gap-3.5 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
            {active.map((r) => (
              <RequestCard key={r.id} request={r} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function RequestCard({ request }: { request: CustomerRequestRow }) {
  const chip = requestStatusChip(request);
  return (
    <Link
      href={`/uzklausos/sekti/${request.trackingToken}`}
      className="flex flex-col gap-3.5 rounded-xl border border-surface-100 bg-white p-4 transition-colors hover:border-surface-300 dark:border-surface-800 dark:bg-surface-900 sm:p-[18px]"
    >
      <div className="flex items-center justify-between gap-2">
        <Chip tone={chip.tone}>{chip.label}</Chip>
        <span className="text-micro font-normal text-surface-500">{formatRelativeDate(request.createdAt)}</span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-body font-semibold text-surface-900 dark:text-white">{request.title}</p>
        <p className="text-caption font-normal text-surface-500">
          {request.location} · {offersLabel(request.responseCount)}
        </p>
      </div>
      <StepBar current={requestStep(request)} />
    </Link>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="mt-2 h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-40 w-full rounded-xl" />
      <div className="grid gap-3.5 sm:grid-cols-2">
        <Skeleton className="h-36 rounded-xl" />
        <Skeleton className="h-36 rounded-xl" />
      </div>
    </div>
  );
}
