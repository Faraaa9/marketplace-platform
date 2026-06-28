import { prisma } from "@/lib/prisma";
import { publicIdFromCloudinaryUrl } from "@/lib/cloudinary";

/** Shared loader for the provider profile editor. Single source of truth for
 *  both the `/api/tiekejas/profilis` GET handler (mutations re-read through it)
 *  and the `/tiekejas/profilis` server page (initial render, no client
 *  round-trip). Returns `null` when the user has no provider profile yet. */
export async function getProviderProfileEditData(userId: string) {
  const [profile, user] = await Promise.all([
    prisma.providerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        description: true,
        headline: true,
        services: true,
        priceFrom: true,
        experienceYears: true,
        offersInvoices: true,
        availableForUrgent: true,
        location: true,
        phone: true,
        website: true,
        isActive: true,
        planType: true,
        planExpiresAt: true,
        images: true,
        slug: true,
        createdAt: true,
        updatedAt: true,
        categories: {
          select: { categoryId: true, sortOrder: true, expiresAt: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, emailVerified: true },
    }),
  ]);

  if (!profile) return null;

  const parsedImages = profile.images.map((url) => ({
    url,
    publicId: publicIdFromCloudinaryUrl(url) ?? "",
  }));

  const now = Date.now();
  // Free/base categories drive the picker; active paid (timed) categories are
  // surfaced separately so the editor can show expiry + a renew action.
  const freeCategoryIds = profile.categories
    .filter((c) => c.expiresAt == null)
    .map((c) => c.categoryId);
  const paidCategories = profile.categories
    .filter((c) => c.expiresAt != null && c.expiresAt.getTime() > now)
    .map((c) => ({ categoryId: c.categoryId, expiresAt: c.expiresAt!.toISOString() }));

  return {
    ...profile,
    images: parsedImages,
    categoryIds: freeCategoryIds,
    paidCategories,
    userName: user?.name || null,
    userEmail: user?.email || null,
    emailVerified: !!user?.emailVerified,
  };
}

export type ProviderProfileEditData = Awaited<
  ReturnType<typeof getProviderProfileEditData>
>;
