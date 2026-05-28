import Link from "next/link";
import {
  FileText,
  MessageCircle,
  Coins,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { MagicCard } from "@/components/magicui/magic-card";
import { prisma } from "@/lib/prisma";
import { expandToMatchSet, activeCategoryFilter } from "@/lib/category-matching";
import { computeProfileCompleteness } from "@/lib/provider-completeness";

interface NextAction {
  label: string;
  description: string;
  href: string;
}

/** The single most important next step for the provider (advisory CTA). */
function getNextAction(stats: {
  emailVerified: boolean;
  isActive: boolean;
  categoryCount: number;
  profileCompleteness: number;
  missingProfileItems: string[];
  matchingRequests: number;
  myResponses: number;
}): NextAction | null {
  if (!stats.emailVerified) return null; // AccountCard banner handles this
  if (!stats.isActive) return null; // AccountCard suspension alert handles this
  if (stats.categoryCount === 0) {
    return {
      label: "Pasirinkite veiklos sritis",
      description: "Be veiklos sričių nematysite jums tinkamų užklausų",
      href: "/tiekejas/profilis",
    };
  }
  if (stats.profileCompleteness < 100) {
    return {
      label: "Užpildykite profilį",
      description: `${stats.profileCompleteness}% — trūksta: ${stats.missingProfileItems.slice(0, 2).join(", ")}`,
      href: "/tiekejas/profilis",
    };
  }
  if (stats.matchingRequests > 0 && stats.myResponses === 0) {
    return {
      label: "Atsakykite į pirmą užklausą",
      description: `${stats.matchingRequests} užklausos atitinka jūsų veiklos sritis`,
      href: "/tiekejas/uzklausos",
    };
  }
  if (stats.matchingRequests > 0) {
    return {
      label: "Peržiūrėkite naujas užklausas",
      description: `${stats.matchingRequests} tinkamos užklausos laukia jūsų pasiūlymo`,
      href: "/tiekejas/uzklausos",
    };
  }
  return null;
}

/**
 * Provider dashboard metrics: a contextual next-action CTA plus the four stat
 * tiles (matching requests, my responses, credits, accepted). Owns the
 * expensive matching count (expandToMatchSet) — computed once here.
 */
export async function StatsGrid({ userId }: { userId: string }) {
  const [profile, user, responseRows] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId },
      select: {
        creditBalance: true,
        isActive: true,
        categories: { where: activeCategoryFilter(), select: { categoryId: true } },
        description: true,
        headline: true,
        services: true,
        location: true,
        phone: true,
        images: true,
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    }),
    prisma.response.findMany({
      where: { providerId: userId },
      select: { id: true, request: { select: { acceptedResponseId: true } } },
    }),
  ]);

  const categoryIds = profile?.categories.map((c) => c.categoryId) ?? [];
  const matchSet = await expandToMatchSet(categoryIds);
  const matchingRequests =
    categoryIds.length > 0
      ? await prisma.serviceRequest.count({
          where: {
            status: "OPEN",
            categoryId: { in: matchSet },
            clientId: { not: userId },
          },
        })
      : 0;

  const myResponses = responseRows.length;
  const acceptedCount = responseRows.filter(
    (row) => row.request.acceptedResponseId === row.id,
  ).length;
  const creditBalance = profile?.creditBalance ?? 0;

  const { completeness, missingItems } = computeProfileCompleteness({
    description: profile?.description ?? null,
    headline: profile?.headline ?? null,
    services: profile?.services ?? null,
    location: profile?.location ?? null,
    phone: profile?.phone ?? null,
    images: profile?.images ?? [],
    categoryCount: categoryIds.length,
  });

  const nextAction = getNextAction({
    emailVerified: !!user?.emailVerified,
    isActive: profile?.isActive ?? false,
    categoryCount: categoryIds.length,
    profileCompleteness: completeness,
    missingProfileItems: missingItems,
    matchingRequests,
    myResponses,
  });

  return (
    <>
      {nextAction && (
        <Link
          href={nextAction.href}
          className="group mb-6 flex items-center gap-3 rounded-2xl border border-brand-200/60 bg-brand-50 px-5 py-4 transition-colors hover:bg-brand-100/60 dark:border-brand-800/40 dark:bg-brand-500/10 dark:hover:bg-brand-500/15"
        >
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-500/20">
            <ArrowRight className="h-4 w-4 text-brand-600 transition-transform group-hover:translate-x-0.5 dark:text-brand-400" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-body-sm font-semibold text-brand-900 dark:text-brand-200">{nextAction.label}</p>
            <p className="truncate text-micro text-brand-700/70 dark:text-brand-400/70">{nextAction.description}</p>
          </div>
        </Link>
      )}

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Link href="/tiekejas/uzklausos">
          <MagicCard className="p-0" gradientColor="rgba(99, 102, 241, 0.06)">
            <div className="flex items-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
                <FileText className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{matchingRequests}</p>
                <p className="text-micro text-surface-500">Tinkamos užklausos</p>
              </div>
            </div>
          </MagicCard>
        </Link>
        <Link href="/tiekejas/atsakymai">
          <MagicCard className="p-0" gradientColor="rgba(16, 185, 129, 0.06)">
            <div className="flex items-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{myResponses}</p>
                <p className="text-micro text-surface-500">Mano atsakymai</p>
              </div>
            </div>
          </MagicCard>
        </Link>
        <Link href="/tiekejas/planai">
          <MagicCard className="p-0" gradientColor="rgba(99, 102, 241, 0.06)">
            <div className="flex items-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950">
                <Coins className="h-5 w-5 text-brand-600 dark:text-brand-400" />
              </div>
              <div>
                <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{creditBalance}</p>
                <p className="text-micro text-surface-500">Kreditai</p>
              </div>
            </div>
          </MagicCard>
        </Link>
        <Link href="/tiekejas/atsakymai?status=priimti">
          <MagicCard className="p-0" gradientColor="rgba(16, 185, 129, 0.06)">
            <div className="flex items-center gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-500/10">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-heading-2 font-bold text-surface-900 dark:text-white">{acceptedCount}</p>
                <p className="text-micro text-surface-500">Priimti</p>
              </div>
            </div>
          </MagicCard>
        </Link>
      </div>
    </>
  );
}
