import Image from "next/image";
import Link from "next/link";
import { MapPin, Star } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getSafeProviderImageUrl } from "@/lib/cloudinary-image";
import { getEffectivePlanType } from "@/lib/constants";

interface SimilarProvidersSectionProps {
  providerId: string;
  categoryIds: string[];
  location: string | null;
}

export default async function SimilarProvidersSection({
  providerId,
  categoryIds,
  location,
}: SimilarProvidersSectionProps) {
  const primaryCategoryId = categoryIds[0];
  if (!primaryCategoryId) return null;

  const providers = await prisma.user.findMany({
    where: {
      id: { not: providerId },
      role: "PROVIDER",
      emailVerified: { not: null },
      providerProfile: {
        isActive: true,
        moderationStatus: "APPROVED",
        categories: { some: { categoryId: primaryCategoryId } },
        ...(location ? { location } : {}),
      },
    },
    select: {
      id: true,
      name: true,
      image: true,
      providerProfile: {
        select: {
          description: true,
          images: true,
          location: true,
          planType: true,
        },
      },
      subscription: { select: { status: true } },
      reviewsReceived: { where: { moderationStatus: "APPROVED" }, select: { rating: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  if (providers.length === 0) return null;

  const mapped = providers.map((provider) => {
    const images: string[] = provider.providerProfile?.images ?? [];

    const reviews = provider.reviewsReceived || [];
    const avgRating =
      reviews.length > 0
        ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10
        : null;

    return {
      id: provider.id,
      name: provider.name || "Tiekėjas",
      image: getSafeProviderImageUrl(images[0] || provider.image),
      description: provider.providerProfile?.description || null,
      location: provider.providerProfile?.location || null,
      planType: getEffectivePlanType(
        provider.providerProfile?.planType || "FREE",
        provider.subscription?.status
      ),
      avgRating,
    };
  });

  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50">
      <h2 className="mb-4 text-heading-3 font-semibold text-surface-900 dark:text-white">
        Panašūs tiekėjai
      </h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {mapped.map((provider) => (
          <Link
            key={provider.id}
            href={`/meistrai/${provider.id}`}
            className="group rounded-xl border border-surface-200/60 p-3 transition-all hover:border-brand-200 hover:bg-brand-50/40 dark:border-surface-700/50 dark:hover:border-brand-800 dark:hover:bg-brand-950/20"
          >
            <div className="mb-2 flex items-center gap-2.5">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-100 dark:bg-brand-900/50">
                {provider.image ? (
                  <Image
                    src={provider.image}
                    alt={provider.name}
                    fill
                    sizes="40px"
                    className="object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-brand-600 dark:text-brand-400">
                    {provider.name[0].toUpperCase()}
                  </span>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate text-body-sm font-semibold text-surface-900 group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                  {provider.name}
                </p>
                {provider.location && (
                  <p className="inline-flex items-center gap-1 text-micro text-surface-400">
                    <MapPin className="h-3 w-3" />
                    {provider.location}
                  </p>
                )}
              </div>
            </div>
            {provider.avgRating !== null && (
              <p className="mb-1 inline-flex items-center gap-1 text-micro font-medium text-amber-600">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {provider.avgRating}
              </p>
            )}
            {provider.description && (
              <p className="line-clamp-2 text-micro leading-relaxed text-surface-500 dark:text-surface-400">
                {provider.description}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
