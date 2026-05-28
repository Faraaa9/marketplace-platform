import { prisma } from "@/lib/prisma";
import { sendEmail, newRequestAlertEmail } from "@/lib/email";
import { expandToMatchSet, activeCategoryFilter } from "@/lib/category-matching";

/**
 * Notify providers whose curated categories match a new request. Matching is
 * tree-aware: a provider who picked a root category is alerted for requests
 * in any category under it. Multi-category: a request can list up to 3
 * categories — the union of all matched provider sets is notified, and the
 * email label uses the primary (first) category's name.
 */
export async function notifyRelevantProviders(
  title: string,
  categoryIds: string[],
  location: string,
  excludeUserId?: string | null,
) {
  const validCategoryIds = categoryIds.filter(Boolean);
  // A request with no curated categories has nothing to match providers on.
  if (validCategoryIds.length === 0) return;

  const [primaryCategory, matchSet] = await Promise.all([
    prisma.category.findUnique({
      where: { id: validCategoryIds[0] },
      select: { name: true },
    }),
    expandToMatchSet(validCategoryIds),
  ]);
  const categoryLabel = primaryCategory?.name || "paslaugos";

  const providers = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      emailVerified: { not: null },
      providerProfile: {
        isActive: true,
        categories: {
          some: { categoryId: { in: matchSet }, ...activeCategoryFilter() },
        },
      },
    },
    select: {
      id: true,
      name: true,
      email: true,
      providerProfile: { select: { location: true } },
    },
  });

  for (const provider of providers) {
    // Skip the request creator (prevent self-notification)
    if (excludeUserId && provider.id === excludeUserId) continue;

    const providerLocation = provider.providerProfile?.location || "";
    const locationMatch =
      providerLocation === location ||
      providerLocation === "Visa Lietuva" ||
      location === "Visa Lietuva";
    if (!locationMatch) continue;

    const emailData = newRequestAlertEmail(provider.name || "Tiekėjau", title, categoryLabel);
    sendEmail({ to: provider.email, ...emailData }).catch(() => {});

    await prisma.notification.create({
      data: {
        userId: provider.id,
        type: "NEW_REQUEST",
        title: "Nauja užklausa",
        body: `Nauja užklausa „${title}" kategorijoje „${categoryLabel}"`,
        link: "/tiekejas/uzklausos",
      },
    });
  }
}
