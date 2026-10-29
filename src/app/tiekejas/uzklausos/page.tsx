import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { SessionGate } from "@/components/auth/SessionGate";
import Skeleton from "@/components/ui/Skeleton";
import { Chip, EmptyPanel, PageHeader } from "@/components/account/ui";
import { competitionLabel, getLeadFeed, type LeadScope } from "@/lib/account/provider-leads";
import { cn, decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Naujos užklausos" };

type SearchParams = Promise<{ rodyti?: string }>;

const FILTERS: { scope: LeadScope; label: string; href: string }[] = [
  { scope: "mine", label: "Mano sritys", href: "/tiekejas/uzklausos" },
  { scope: "fresh", label: "Be pasiūlymų", href: "/tiekejas/uzklausos?rodyti=be-pasiulymu" },
  { scope: "all", label: "Visos", href: "/tiekejas/uzklausos?rodyti=visos" },
];

export default function ProviderLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="flex flex-col gap-[18px]">
      <PageHeader
        title="Naujos užklausos"
        sub="Užklausos, atitinkančios jūsų veiklos sritis. Kontaktai atrakinami už 1 kreditą."
      />
      <Suspense fallback={<LeadsSkeleton />}>
        <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/uzklausos">
          {(userId) => <LeadFeed userId={userId} searchParams={searchParams} />}
        </SessionGate>
      </Suspense>
    </div>
  );
}

async function LeadFeed({ userId, searchParams }: { userId: string; searchParams: SearchParams }) {
  const { rodyti } = await searchParams;
  const scope: LeadScope = rodyti === "visos" ? "all" : rodyti === "be-pasiulymu" ? "fresh" : "mine";
  const { leads, hasCategories, location } = await getLeadFeed(userId, scope);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.scope}
            href={f.href}
            aria-current={f.scope === scope ? "page" : undefined}
            className={cn(
              "inline-flex min-h-11 items-center rounded-full border px-3.5 text-caption font-medium transition-colors sm:min-h-8",
              f.scope === scope
                ? "border-surface-900 bg-surface-900 text-white dark:border-white dark:bg-white dark:text-surface-900"
                : "border-surface-200 bg-white text-surface-700 hover:border-surface-400 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300",
            )}
          >
            {f.label}
          </Link>
        ))}
        <span className="ml-auto text-caption font-normal text-surface-500">
          {location ? `Miestas: ${location}` : "Miestas nenurodytas"} ·{" "}
          <Link href="/tiekejas/profilis#location" className="text-brand-700 hover:underline dark:text-brand-400">
            keisti
          </Link>
        </span>
      </div>

      {!hasCategories && scope !== "all" ? (
        <EmptyPanel>
          Pasirinkite veiklos sritis, kad matytumėte jums tinkamas užklausas.{" "}
          <Link href="/tiekejas/profilis#categories" className="font-semibold text-brand-700 hover:underline">
            Pasirinkti sritis
          </Link>
        </EmptyPanel>
      ) : leads.length === 0 ? (
        <EmptyPanel>
          {scope === "fresh"
            ? "Šiuo metu visos užklausos jūsų srityse jau turi pasiūlymų."
            : "Šiuo metu naujų užklausų nėra. Pranešime, kai atsiras."}
        </EmptyPanel>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {leads.map((l) => {
            const title = decodeHtmlEntities(l.title);
            const desc = decodeHtmlEntities(l.description);
            return (
              <li key={l.id}>
                <Link
                  href={`/tiekejas/uzklausa/${l.id}`}
                  className="flex flex-col gap-2.5 rounded-xl border border-surface-100 bg-white px-4 py-4 transition-colors hover:border-surface-300 dark:border-surface-800 dark:bg-surface-900 sm:px-[18px]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="text-body font-semibold text-surface-900 dark:text-white">{title}</span>
                      {l.sentResponseId ? (
                        <Chip tone="open">Pasiūlymas išsiųstas</Chip>
                      ) : l.unlocked ? (
                        <Chip tone="progress">Atrakinta</Chip>
                      ) : null}
                      {scope === "all" && !l.inMyCategories && <Chip tone="closed">Ne jūsų sritis</Chip>}
                    </div>
                    <span className="text-micro font-normal text-surface-500">{formatRelativeDate(l.createdAt)}</span>
                  </div>
                  <p className="line-clamp-2 text-surface-600 dark:text-surface-400">{desc}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-caption font-normal">
                    <strong className="font-semibold">{l.location}</strong>
                    <span>Biudžetas: {l.budget || "nenurodytas"}</span>
                    <span>Terminas: {l.deadline || "nenurodytas"}</span>
                    <span className="text-surface-500">{competitionLabel(l.offerCount)}</span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function LeadsSkeleton() {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}
