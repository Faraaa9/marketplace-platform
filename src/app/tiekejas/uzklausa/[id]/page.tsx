import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check } from "lucide-react";
import { SessionGate } from "@/components/auth/SessionGate";
import Skeleton from "@/components/ui/Skeleton";
import RequestPhotos from "@/components/requests/RequestPhotos";
import { BUTTON_GHOST, ButtonLink, Chip, Notice, Panel, PanelTitle } from "@/components/account/ui";
import { prisma } from "@/lib/prisma";
import { isLeadUnlocked } from "@/lib/credits";
import { checkEligibility } from "@/lib/provider-eligibility";
import { competitionLabel } from "@/lib/account/provider-leads";
import { decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";
import LeadOfferPanel from "./LeadOfferPanel";

export const metadata: Metadata = { title: "Užklausa" };

type Params = Promise<{ id: string }>;

export default function ProviderLeadPage({ params }: { params: Params }) {
  return (
    <div className="flex flex-col gap-[18px]">
      <Link href="/tiekejas/uzklausos" className={`${BUTTON_GHOST} self-start`}>
        ← Naujos užklausos
      </Link>
      <Suspense fallback={<LeadSkeleton />}>
        <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/uzklausos">
          {(userId) => <Lead userId={userId} params={params} />}
        </SessionGate>
      </Suspense>
    </div>
  );
}

async function Lead({ userId, params }: { userId: string; params: Params }) {
  const { id } = await params;
  const [request, profile, user] = await Promise.all([
    prisma.serviceRequest.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        description: true,
        location: true,
        budget: true,
        deadline: true,
        attachmentUrls: true,
        status: true,
        moderationStatus: true,
        clientId: true,
        clientName: true,
        clientEmail: true,
        clientPhone: true,
        createdAt: true,
        categoryRef: { select: { id: true, rootId: true, parentId: true, name: true } },
        _count: { select: { responses: true } },
        responses: { where: { providerId: userId }, select: { id: true }, take: 1 },
      },
    }),
    prisma.providerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        creditBalance: true,
        isActive: true,
        categories: { select: { category: { select: { id: true, rootId: true, parentId: true } } } },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } }),
  ]);
  // Unapproved requests are not leads; hide them as if missing.
  if (!request || !profile || (request.moderationStatus !== "APPROVED" && request.clientId !== userId)) notFound();

  if (request.clientId !== userId) {
    // Same best-effort view record the leads API writes; feeds the customer's
    // "Peržiūrėjo" count.
    await prisma.requestView
      .upsert({
        where: { requestId_providerId: { requestId: id, providerId: userId } },
        create: { requestId: id, providerId: userId },
        update: {},
      })
      .catch(() => null);
  }

  const unlocked = await isLeadUnlocked(profile.id, id);
  const sentResponseId = request.responses[0]?.id ?? null;
  const eligibility = checkEligibility(
    userId,
    { status: request.status, clientId: request.clientId, category: request.categoryRef },
    profile.categories.map((c) => c.category),
  );
  const accountReady = profile.isActive && !!user?.emailVerified;
  const comp = competitionLabel(request._count.responses);

  return (
    <>
      <div>
        {request.categoryRef?.name && <Chip tone="progress">{request.categoryRef.name}</Chip>}
        <h1 className="mt-2.5 font-serif text-[26px] font-semibold leading-tight text-surface-900 dark:text-white sm:text-[28px]">
          {decodeHtmlEntities(request.title)}
        </h1>
        <p className="mt-1.5 text-body-sm text-surface-500">
          {request.location} · pateikta {formatRelativeDate(request.createdAt).toLowerCase()} · {comp}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-5">
        <section className="flex min-w-0 flex-[999_1_480px] flex-col gap-3.5">
          <Panel>
            <PanelTitle>Ko reikia klientui</PanelTitle>
            <p className="whitespace-pre-wrap leading-relaxed">{decodeHtmlEntities(request.description)}</p>
            {request.attachmentUrls.length > 0 && (
              <div className="mt-4">
                <RequestPhotos urls={request.attachmentUrls} />
              </div>
            )}
          </Panel>

          {sentResponseId ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3.5 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
              <Check className="h-5 w-5 shrink-0" strokeWidth={2.2} />
              <div className="min-w-0 flex-[1_1_220px]">
                <p className="font-semibold">Pasiūlymas išsiųstas.</p>
                <p className="text-caption font-normal opacity-90">Klientas gavo pranešimą. Pokalbis — skiltyje „Žinutės“.</p>
              </div>
              <ButtonLink href={`/tiekejas/zinutes?thread=response-${sentResponseId}`}>Atidaryti pokalbį</ButtonLink>
              <ButtonLink href="/tiekejas/pasiulymai">Mano pasiūlymai</ButtonLink>
            </div>
          ) : !eligibility.allowed ? (
            <Notice tone="info">
              {eligibility.message}{" "}
              {(eligibility.code === "NO_SPECIALIZATIONS" || eligibility.code === "SPECIALIZATION_MISMATCH") && (
                <Link href="/tiekejas/profilis#categories" className="font-semibold underline">
                  Keisti veiklos sritis
                </Link>
              )}
            </Notice>
          ) : !accountReady ? (
            <Notice tone="warn" title="Profilis dar neaktyvus">
              Kad galėtumėte atrakinti užklausas ir siųsti pasiūlymus, patvirtinkite el. paštą ir įjunkite profilį.{" "}
              <Link href="/tiekejas/profilis" className="font-semibold underline">
                Į profilį
              </Link>
            </Notice>
          ) : (
            <LeadOfferPanel requestId={request.id} unlocked={unlocked} credits={profile.creditBalance} />
          )}
        </section>

        <aside className="flex min-w-0 flex-[1_1_260px] flex-col gap-3">
          <Panel>
            <PanelTitle>Detalės</PanelTitle>
            <Details
              rows={[
                ["Miestas", request.location],
                ["Biudžetas", request.budget || "Nenurodytas"],
                ["Terminas", request.deadline || "Nenurodytas"],
                ["Konkurencija", comp],
              ]}
            />
          </Panel>
          <Panel>
            <PanelTitle>Klientas</PanelTitle>
            {unlocked && accountReady ? (
              <Details
                rows={[
                  ["Vardas", request.clientName || "—"],
                  ["Telefonas", request.clientPhone || "Nenurodytas"],
                  ["El. paštas", request.clientEmail],
                ]}
              />
            ) : (
              <p className="text-caption font-normal text-surface-500">Vardas ir kontaktai matomi atrakinus.</p>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Details({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-2 text-[13.5px]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-surface-500">{label}</dt>
          <dd className="m-0 break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function LeadSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  );
}
