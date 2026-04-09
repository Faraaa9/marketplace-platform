import { prisma } from "@/lib/prisma";
import { sendEmail, newRequestAlertEmail } from "@/lib/email";
import { SERVICE_CATEGORIES } from "@/lib/constants";

export async function notifyRelevantProviders(title: string, category: string, location: string, excludeUserId?: string | null) {
  const providers = await prisma.user.findMany({
    where: {
      role: "PROVIDER",
      emailVerified: { not: null },
      providerProfile: { isActive: true },
    },
    select: {
      id: true,
      name: true,
      email: true,
      providerProfile: { select: { specializations: true, location: true } },
    },
  });

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === category)?.label || category;

  for (const provider of providers) {
    // Skip the request creator (prevent self-notification)
    if (excludeUserId && provider.id === excludeUserId) continue;

    let specs: string[] = [];
    try {
      specs = typeof provider.providerProfile?.specializations === "string"
        ? JSON.parse(provider.providerProfile.specializations)
        : provider.providerProfile?.specializations || [];
    } catch {
      specs = [];
    }

    const providerLocation = provider.providerProfile?.location || "";
    const specMatch = specs.includes(category);
    if (!specMatch) continue;

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
