import Link from "next/link";
import { ArrowRight, Circle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { computeProfileCompleteness } from "@/lib/provider-completeness";

/**
 * Profile-completeness progress bar. Shown only to an active, verified provider
 * whose profile is below 100% (mirrors the legacy `canAccessRequests &&
 * completeness < 100` gate).
 */
export async function ProfileCompletenessCard({ userId }: { userId: string }) {
  const [profile, user] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId },
      select: {
        isActive: true,
        description: true,
        headline: true,
        services: true,
        location: true,
        phone: true,
        images: true,
        categories: { select: { categoryId: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { emailVerified: true },
    }),
  ]);

  const canAccess = !!user?.emailVerified && (profile?.isActive ?? false);
  if (!canAccess || !profile) return null;

  const { completeness, missingItems } = computeProfileCompleteness({
    description: profile.description,
    headline: profile.headline,
    services: profile.services,
    location: profile.location,
    phone: profile.phone,
    images: profile.images ?? [],
    categoryCount: profile.categories.length,
  });

  if (completeness >= 100) return null;

  return (
    <Link
      href="/tiekejas/profilis"
      className="group block h-full rounded-2xl border border-surface-200/60 bg-white p-5 shadow-soft transition-colors hover:border-brand-200 dark:border-surface-700/50 dark:bg-surface-900/50 dark:hover:border-brand-800/40"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-body-sm font-semibold text-surface-900 dark:text-white">
            Profilio kokybė
          </p>
          <p className="mt-0.5 text-micro text-surface-500 dark:text-surface-400">
            Didesnis pilnumas padeda klientui greičiau apsispręsti.
          </p>
        </div>
        <span className="rounded-lg bg-surface-100 px-2.5 py-1 text-caption font-bold tabular-nums text-surface-700 dark:bg-surface-800 dark:text-surface-200">
          {completeness}%
        </span>
      </div>
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
          style={{ width: `${completeness}%` }}
        />
      </div>
      {missingItems.length > 0 && (
        <div className="space-y-2">
          {missingItems.slice(0, 3).map((item) => (
            <div key={item} className="flex items-center gap-2 text-body-sm text-surface-600 dark:text-surface-300">
              <Circle className="h-3.5 w-3.5 text-surface-300 dark:text-surface-600" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 inline-flex items-center gap-1.5 text-body-sm font-semibold text-brand-600 transition-colors group-hover:text-brand-700 dark:text-brand-400">
        Užpildyti profilį
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </div>
      {missingItems.length > 3 && (
        <p className="mt-2 text-micro text-surface-400">
          Dar {missingItems.length - 3} trūkstami laukai.
        </p>
      )}
    </Link>
  );
}
