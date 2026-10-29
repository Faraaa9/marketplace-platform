import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SessionGate } from "@/components/auth/SessionGate";
import Skeleton from "@/components/ui/Skeleton";
import { AnnouncementCards } from "@/components/announcements/AnnouncementCards";
import {
  AttentionList,
  ButtonLink,
  Chip,
  KpiTile,
  PageHeader,
  Panel,
  PanelTitle,
  type AttentionItem,
} from "@/components/account/ui";
import { countNewLeads, getLeadFeed } from "@/lib/account/provider-leads";
import { getProviderBasics, getProviderOffers, getWaitingThreads } from "@/lib/account/provider-data";
import { cn, decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Šiandien" };

const RECENT_WIN_DAYS = 14;

export default function ProviderTodayPage() {
  return (
    <Suspense fallback={<TodaySkeleton />}>
      <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas">
        {(userId) => <ProviderToday userId={userId} />}
      </SessionGate>
    </Suspense>
  );
}

async function ProviderToday({ userId }: { userId: string }) {
  const [basics, newLeads, waiting, offers, feed] = await Promise.all([
    getProviderBasics(userId),
    countNewLeads(userId),
    getWaitingThreads(userId),
    getProviderOffers(userId),
    getLeadFeed(userId, "fresh"),
  ]);
  const { user, profile, completeness, checklist } = basics;
  if (!profile) return <NoProviderProfile />;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const sentThisMonth = offers.filter((o) => o.createdAt >= monthStart);
  const wonThisMonth = sentThisMonth.filter((o) => o.state === "won").length;
  const winCutoff = new Date();
  winCutoff.setDate(winCutoff.getDate() - RECENT_WIN_DAYS);
  const recentWins = offers.filter(
    (o) => o.state === "won" && o.requestStatus === "IN_PROGRESS" && o.decidedAt >= winCutoff,
  );

  const todo: AttentionItem[] = [
    ...waiting.slice(0, 3).map((t, i) => ({
      key: `wait-${t.key}`,
      tone: "msg" as const,
      title: `${t.client} laukia atsakymo — ${t.about}`,
      detail: `${t.preview ? `„${decodeHtmlEntities(t.preview).slice(0, 120)}“ · ` : ""}${formatRelativeDate(t.at).toLowerCase()}`,
      href: `/tiekejas/zinutes?thread=${encodeURIComponent(t.key)}`,
      action: "Atsakyti",
      primary: i === 0,
    })),
    ...feed.leads
      .filter((l) => !l.sentResponseId)
      .slice(0, 2)
      .map((l) => ({
        key: `lead-${l.id}`,
        tone: "new" as const,
        title: `Nauja užklausa: ${decodeHtmlEntities(l.title)}`,
        detail: `${l.location} · pasiūlymų dar nėra — būkite pirmas`,
        href: `/tiekejas/uzklausa/${l.id}`,
        action: "Peržiūrėti",
      })),
    ...recentWins.slice(0, 2).map((o) => ({
      key: `won-${o.id}`,
      tone: "won" as const,
      title: `Jūsų pasiūlymas priimtas — ${o.title}`,
      detail: "Kliento kontaktai jau matomi pokalbyje",
      href: `/tiekejas/zinutes?thread=response-${o.id}`,
      action: "Atidaryti",
    })),
    ...(completeness < 100
      ? [
          {
            key: "profile",
            tone: "profile" as const,
            title: profile.images.length === 0 ? "Pridėkite darbų nuotraukų" : "Užbaikite profilį",
            detail:
              profile.images.length === 0
                ? "Profiliai su nuotraukomis gauna daugiau atsakymų"
                : `Trūksta: ${checklist.filter((c) => !c.done).map((c) => c.label.toLowerCase()).join(", ")}`,
            href: "/tiekejas/profilis",
            action: profile.images.length === 0 ? "Pridėti" : "Užpildyti",
          },
        ]
      : []),
  ];

  const firstName = (user?.name?.trim() || "").split(/\s+/)[0];
  const areas = profile.categories.map((c) => c.category.name).slice(0, 3).join(", ");
  const visible = profile.isActive && profile.moderationStatus === "APPROVED" && !!user?.emailVerified;

  return (
    <div className="flex flex-col gap-[22px]">
      <PageHeader
        title={firstName ? `Labas, ${firstName}` : "Šiandien"}
        sub={[areas, profile.location].filter(Boolean).join(" · ") || "Pasirinkite veiklos sritis profilyje"}
        actions={
          <Chip tone={visible ? "open" : "warn"}>
            ● {visible ? "Profilis matomas klientams" : "Profilis dar nematomas klientams"}
          </Chip>
        }
      />

      <AnnouncementCards surface="provider" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiTile value={newLeads} label="naujos užklausos jūsų srityse" href="/tiekejas/uzklausos" />
        <KpiTile value={waiting.length} label="klientai laukia jūsų atsakymo" href="/tiekejas/zinutes" />
        <KpiTile
          value={`${wonThisMonth} iš ${sentThisMonth.length}`}
          label="pasiūlymų priimta šį mėnesį"
          href="/tiekejas/pasiulymai"
        />
        <KpiTile value={profile.creditBalance} label="kreditai · 1 kreditas = 1 užklausa" href="/tiekejas/planai" />
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <Panel className="min-w-0 flex-[999_1_480px]">
          <PanelTitle>Ką daryti dabar</PanelTitle>
          <AttentionList items={todo} empty="Viskas atlikta. Naujos užklausos ir žinutės atsiras čia." />
        </Panel>

        <Panel className="min-w-0 flex-[1_1_260px]">
          <PanelTitle aside={<strong>{completeness}%</strong>}>Profilio paruošimas</PanelTitle>
          <div className="mb-2 h-2 overflow-hidden rounded bg-surface-50 dark:bg-surface-800">
            <i className="block h-full rounded bg-emerald-600" style={{ width: `${completeness}%` }} />
          </div>
          <ul>
            {checklist.map((item) => (
              <li key={item.label} className="flex items-center gap-2.5 py-2 text-[13.5px]">
                <span
                  className={cn(
                    "grid h-5 w-5 shrink-0 place-items-center rounded-full text-micro",
                    item.done ? "bg-emerald-600 text-white" : "border-[1.5px] border-surface-300 text-transparent",
                  )}
                  aria-hidden
                >
                  ✓
                </span>
                <span className={cn(!item.done && "text-surface-600 dark:text-surface-400")}>{item.label}</span>
                <span className="sr-only">{item.done ? "atlikta" : "neatlikta"}</span>
              </li>
            ))}
          </ul>
          {completeness < 100 && (
            <ButtonLink href="/tiekejas/profilis" className="mt-2.5 w-full">
              Užbaigti profilį
            </ButtonLink>
          )}
        </Panel>
      </div>
    </div>
  );
}

function NoProviderProfile() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
        <Sparkles className="h-8 w-8 text-brand-600" />
      </div>
      <h2 className="mb-3 text-heading-2 font-bold text-surface-900 dark:text-white">Neturite meistro profilio</h2>
      <p className="mb-6 text-body text-surface-500 dark:text-surface-400">
        Sukurkite profilį per kelias sekundes — užteks įklijuoti savo paslaugos.lt ar LinkedIn nuorodą.
      </p>
      <div className="flex justify-center gap-3">
        <ButtonLink href="/meistrai/kurti-profili" variant="primary">
          <Sparkles className="h-4 w-4" />
          Sukurti profilį su AI
        </ButtonLink>
        <Link href="/" className="inline-flex min-h-11 items-center px-3 text-body-sm text-surface-600 hover:underline">
          Į pradžią
        </Link>
      </div>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="flex flex-col gap-[22px]">
      <Skeleton className="h-8 w-56" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
