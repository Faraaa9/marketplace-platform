import Link from "next/link";
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
      className="group mb-6 block rounded-2xl border border-surface-200/60 bg-white p-4 transition-colors hover:border-brand-200 dark:border-surface-700/50 dark:bg-surface-900/50 dark:hover:border-brand-800/40"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-micro font-medium text-surface-500">Profilis</p>
        <p className="text-body-sm font-bold text-surface-900 dark:text-white">{completeness}%</p>
      </div>
      <div className="mb-2 h-2 w-full overflow-hidden rounded-full bg-surface-100 dark:bg-surface-700">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
          style={{ width: `${completeness}%` }}
        />
      </div>
      {missingItems.length > 0 && (
        <p className="truncate text-micro text-surface-400">
          Trūksta: {missingItems.join(", ")}
        </p>
      )}
    </Link>
  );
}
