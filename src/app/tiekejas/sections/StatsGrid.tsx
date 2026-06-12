import Link from "next/link";
import {
  MessageCircle,
  Coins,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { activeCategoryFilter } from "@/lib/category-matching";
import { computeProfileCompleteness } from "@/lib/provider-completeness";
import { createServerTimer } from "@/lib/server-timing";

interface NextAction {
  label: string;
  description: string;
  href: string;
}

function profileHrefForMissingItem(item: string | undefined) {
  switch (item) {
    case "Aprašymas":
      return "/tiekejas/profilis#description";
    case "Antraštė":
      return "/tiekejas/profilis#headline";
    case "Kategorijos":
      return "/tiekejas/profilis#categories";
    case "Paslaugos":
      return "/tiekejas/profilis#services";
    case "Miestas":
      return "/tiekejas/profilis#location";
    case "Telefonas":
      return "/tiekejas/profilis#phone";
    case "Nuotraukos":
      return "/tiekejas/profilis#images";
    default:
      return "/tiekejas/profilis";
  }
}

/** The single most important next step for the provider (advisory CTA). */
function getNextAction(stats: {
  emailVerified: boolean;
  isActive: boolean;
  categoryCount: number;
  profileCompleteness: number;
  missingProfileItems: string[];
  creditBalance: number;
}): NextAction | null {
  if (!stats.emailVerified) return null; // AccountCard banner handles this
  if (!stats.isActive) return null; // AccountCard suspension alert handles this
  if (stats.categoryCount === 0) {
    return {
      label: "Pasirinkite veiklos sritis",
      description: "Be veiklos sričių klientai jūsų neras paieškoje",
      href: "/tiekejas/profilis#categories",
    };
  }
  if (stats.profileCompleteness < 100) {
    return {
      label: "Užpildykite profilį",
      description: `${stats.profileCompleteness}% — trūksta: ${stats.missingProfileItems.slice(0, 2).join(", ")}`,
      href: profileHrefForMissingItem(stats.missingProfileItems[0]),
    };
  }
  if (stats.creditBalance === 0) {
    return {
      label: "Papildykite kreditus",
      description: "Atsakymui klientui reikia bent 1 kredito",
      href: "/tiekejas/planai",
    };
  }
  return null;
}

/**
 * Provider dashboard metrics: a contextual next-action CTA plus the three stat
 * tiles (conversations, credits, accepted). The provider's work center is the
 * messages inbox (/tiekejas/zinutes); lead discovery lives on the public board,
 * so this dashboard no longer surfaces an internal requests list.
 */
export async function StatsGrid({ userId }: { userId: string }) {
  const timer = createServerTimer("provider-dashboard-stats");
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
  timer.mark("profileUserResponses");

  const categoryIds = profile?.categories.map((c) => c.categoryId) ?? [];
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
    creditBalance,
  });
  const readinessSteps = [
    {
      label: "Paskyra patvirtinta",
      done: !!user?.emailVerified,
      href: "/patvirtinti",
    },
    {
      label: "Profilis aktyvus",
      done: profile?.isActive ?? false,
      href: "/tiekejas/profilis",
    },
    {
      label: "Veiklos sritys pasirinktos",
      done: categoryIds.length > 0,
      href: "/tiekejas/profilis#categories",
    },
    {
      label: "Profilis įtikinamas",
      done: completeness >= 100,
      href: profileHrefForMissingItem(missingItems[0]),
    },
    {
      label: "Yra kreditų atsakymams",
      done: creditBalance > 0,
      href: "/tiekejas/planai",
    },
  ];
  const missingReadiness = readinessSteps.find((step) => !step.done);
  timer.end({
    categories: categoryIds.length,
    responses: responseRows.length,
  });

  return (
    <section className="mb-6">
      <div className="rounded-2xl border border-surface-200/60 bg-white p-5 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50 sm:p-6">
        <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-body-sm font-medium text-surface-500 dark:text-surface-400">
              Šiandien svarbiausia
            </p>
            <h2 className="mt-1 text-heading-2 font-bold text-surface-900 dark:text-white">
              {nextAction?.label ?? "Tikrinkite žinutes"}
            </h2>
            <p className="mt-1 max-w-xl text-body-sm leading-relaxed text-surface-500 dark:text-surface-400">
              {nextAction?.description ??
                "Profilis paruoštas. Nauji klientų kontaktai ir atsakymai laukia jūsų pašto dėžutėje."}
            </p>
          </div>
          <Link
            href={nextAction?.href ?? "/tiekejas/zinutes"}
            className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700"
          >
            {nextAction ? "Atlikti veiksmą" : "Atidaryti žinutes"}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {missingReadiness && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-800 dark:border-amber-800/50 dark:bg-amber-500/10 dark:text-amber-200">
            Pirmiausia sutvarkykite:{" "}
            <Link href={missingReadiness.href} className="font-semibold underline-offset-2 hover:underline">
              {missingReadiness.label}
            </Link>
            . Tada galėsite greičiau atsakyti klientams ir siųsti pasiūlymus.
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <MetricTile
            href="/tiekejas/zinutes"
            icon={MessageCircle}
            value={myResponses}
            label="Pokalbiai"
            tone="emerald"
          />
          <MetricTile
            href="/tiekejas/planai"
            icon={Coins}
            value={creditBalance}
            label="Kreditai"
            tone={creditBalance > 0 ? "brand" : "amber"}
          />
          <MetricTile
            href="/tiekejas/zinutes"
            icon={CheckCircle2}
            value={acceptedCount}
            label="Priimti"
            tone="emerald"
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {readinessSteps.map((step) => (
            <Link
              key={step.label}
              href={step.href}
              className={`flex min-h-[44px] items-center gap-2 rounded-xl border px-3 py-2 text-caption font-semibold transition-colors ${
                step.done
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/50 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-300 dark:border-amber-800/50 dark:bg-amber-500/10 dark:text-amber-300"
              }`}
            >
              <CheckCircle2
                className={`h-4 w-4 shrink-0 ${
                  step.done ? "text-emerald-600 dark:text-emerald-300" : "text-amber-500"
                }`}
              />
              <span className="min-w-0">{step.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function MetricTile({
  href,
  icon: Icon,
  value,
  suffix,
  label,
  tone,
}: {
  href: string;
  icon: typeof Coins;
  value: number;
  suffix?: string;
  label: string;
  tone: "brand" | "emerald" | "amber";
}) {
  const toneClass = {
    brand:
      "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
    emerald:
      "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    amber:
      "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  }[tone];

  return (
    <Link
      href={href}
      className="group rounded-xl border border-surface-200/70 bg-surface-50/70 p-3 transition-colors hover:border-brand-200 hover:bg-white dark:border-surface-700/50 dark:bg-surface-800/30 dark:hover:border-brand-800/50 dark:hover:bg-surface-800/60"
    >
      <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-lg ${toneClass}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="text-heading-3 font-bold tabular-nums text-surface-900 dark:text-white">
        {value}{suffix}
      </p>
      <p className="text-micro font-medium text-surface-500 dark:text-surface-400">
        {label}
      </p>
    </Link>
  );
}
