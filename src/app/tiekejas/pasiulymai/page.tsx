import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SessionGate } from "@/components/auth/SessionGate";
import Skeleton from "@/components/ui/Skeleton";
import { ButtonLink, Chip, EmptyPanel, PageHeader, Tabs, type ChipTone } from "@/components/account/ui";
import { getProviderOffers, OFFER_STATES, type OfferState } from "@/lib/account/provider-data";
import { formatRelativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Mano pasiūlymai" };

type SearchParams = Promise<{ busena?: string }>;

const CHIP_TONE: Record<OfferState, ChipTone> = { wait: "closed", talk: "progress", won: "open", lost: "closed" };

export default function ProviderOffersPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="Mano pasiūlymai" sub="Kiekvieno išsiųsto pasiūlymo būsena — nuo išsiuntimo iki darbo." />
      <Suspense fallback={<Skeleton className="h-64 w-full rounded-xl" />}>
        <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/pasiulymai">
          {(userId) => <OffersList userId={userId} searchParams={searchParams} />}
        </SessionGate>
      </Suspense>
    </div>
  );
}

async function OffersList({ userId, searchParams }: { userId: string; searchParams: SearchParams }) {
  const { busena } = await searchParams;
  const offers = await getProviderOffers(userId);
  const tab: OfferState = OFFER_STATES.some((s) => s.value === busena) ? (busena as OfferState) : "wait";
  const list = offers.filter((o) => o.state === tab);
  const stateMeta = OFFER_STATES.find((s) => s.value === tab)!;

  return (
    <div>
      <Tabs
        items={OFFER_STATES.map((s) => ({
          href: s.value === "wait" ? "/tiekejas/pasiulymai" : `/tiekejas/pasiulymai?busena=${s.value}`,
          label: `${s.label} (${offers.filter((o) => o.state === s.value).length})`,
          active: s.value === tab,
        }))}
      />
      <div className="mt-4 flex flex-col gap-2.5">
        {list.length === 0 ? (
          <EmptyPanel>
            {offers.length === 0 ? (
              <>
                Dar neišsiuntėte nė vieno pasiūlymo.{" "}
                <Link href="/tiekejas/uzklausos" className="font-semibold text-brand-700 hover:underline">
                  Peržiūrėti naujas užklausas
                </Link>
              </>
            ) : (
              "Čia kol kas nieko nėra."
            )}
          </EmptyPanel>
        ) : (
          list.map((o) => (
            <div
              key={o.id}
              className="flex flex-wrap items-center gap-x-3.5 gap-y-2 rounded-xl border border-surface-100 bg-white px-4 py-3.5 dark:border-surface-800 dark:bg-surface-900"
            >
              <div className="min-w-0 flex-[1_1_240px]">
                <p className="truncate font-semibold">{o.title}</p>
                <p className="text-caption font-normal text-surface-500">
                  {o.client} · {o.city} · išsiųsta {formatRelativeDate(o.createdAt).toLowerCase()}
                </p>
              </div>
              <span className="font-bold">{o.price != null ? `${o.price.toLocaleString("lt-LT")} €` : "—"}</span>
              <Chip tone={CHIP_TONE[o.state]}>{stateMeta.chip}</Chip>
              <ButtonLink href={`/tiekejas/zinutes?thread=response-${o.id}`}>Pokalbis</ButtonLink>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
