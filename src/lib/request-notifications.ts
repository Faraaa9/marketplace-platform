import { prisma } from "@/lib/prisma";
import { sendEmail, newRequestAlertEmail, unsubscribeUrl } from "@/lib/email";
import { expandToMatchSet, activeCategoryFilter } from "@/lib/category-matching";
import { SERVICE_CATEGORY_WHERE } from "@/lib/service-categories";

// ponytail: 200 recipients per request is ~10x today's whole provider base; a
// request matching more than that needs a queue, not a bigger loop.
const MAX_RECIPIENTS = 200;
const EMAIL_BATCH = 10;

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
  requestLocation: string,
  excludeUserId?: string | null,
) {
  // An empty location means "anywhere" (create.ts already maps it; the email
  // verify path does not).
  const location = requestLocation.trim() || "Visa Lietuva";
  const validCategoryIds = categoryIds.filter(Boolean);
  // A request with no curated categories has nothing to match providers on.
  if (validCategoryIds.length === 0) return;

  const [primaryCategory, matchSet] = await Promise.all([
    prisma.category.findFirst({
      where: { ...SERVICE_CATEGORY_WHERE, id: validCategoryIds[0] },
      select: { name: true },
    }),
    expandToMatchSet(validCategoryIds),
  ]);
  const categoryLabel = primaryCategory?.name || "paslaugos";

  const providers = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      emailVerified: { not: null },
      // Skip the request creator (prevent self-notification)
      ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
      providerProfile: {
        isActive: true,
        // "Visa Lietuva" on either side matches everywhere.
        ...(location === "Visa Lietuva" ? {} : { location: { in: [location, "Visa Lietuva"] } }),
        categories: {
          some: { categoryId: { in: matchSet }, ...activeCategoryFilter() },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_RECIPIENTS,
    select: { id: true, name: true, email: true, emailAlertsOptOut: true },
  });
  if (providers.length === 0) return;
  if (providers.length === MAX_RECIPIENTS) {
    console.warn(`[notify] recipient cap ${MAX_RECIPIENTS} hit for "${title}" — some providers were not alerted`);
  }

  await prisma.notification.createMany({
    data: providers.map((provider) => ({
      userId: provider.id,
      type: "NEW_REQUEST",
      title: "Nauja užklausa",
      body: `Nauja užklausa „${title}" kategorijoje „${categoryLabel}"`,
      link: "/uzklausos",
    })),
  });

  const recipients = providers.filter((p) => !p.emailAlertsOptOut);
  for (let i = 0; i < recipients.length; i += EMAIL_BATCH) {
    await Promise.allSettled(
      recipients.slice(i, i + EMAIL_BATCH).map((provider) =>
        sendEmail({
          to: provider.email,
          ...newRequestAlertEmail(provider.name || "Tiekėjau", title, categoryLabel, unsubscribeUrl(provider.id)),
        }),
      ),
    );
  }
}
