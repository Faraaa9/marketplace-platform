import { prisma } from "@/lib/prisma";
import { sendEmail, newRequestAlertEmail } from "@/lib/email";
import { expandToMatchSet } from "@/lib/category-matching";

/**
 * Notify providers whose curated categories match a new request. Matching is
 * tree-aware: a provider who picked a root category is alerted for requests
 * in any category under it.
 */
export async function notifyRelevantProviders(
  title: string,
  categoryId: string | null,
  location: string,
  excludeUserId?: string | null,
) {
  // A request with no curated category has nothing to match providers on.
  if (!categoryId) return;

  const [category, matchSet] = await Promise.all([
    prisma.category.findUnique({ where: { id: categoryId }, select: { name: true } }),
    expandToMatchSet([categoryId]),
  ]);
  const categoryLabel = category?.name || "paslaugos";

  const providers = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      emailVerified: { not: null },
      providerProfile: {
        isActive: true,
        categories: { some: { categoryId: { in: matchSet } } },
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
