import "server-only";
import { prisma } from "@/lib/prisma";
import { activeCategoryFilter } from "@/lib/category-matching";
import { computeProfileCompleteness } from "@/lib/provider-completeness";
import { decodeHtmlEntities } from "@/lib/utils";

export async function getProviderBasics(userId: string) {
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true, emailVerified: true } }),
    prisma.providerProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        slug: true,
        creditBalance: true,
        isActive: true,
        moderationStatus: true,
        headline: true,
        description: true,
        services: true,
        location: true,
        phone: true,
        images: true,
        priceFrom: true,
        categories: { where: activeCategoryFilter(), select: { category: { select: { name: true } } } },
      },
    }),
  ]);
  if (!profile) return { user, profile: null, completeness: 0, checklist: [] };

  const { completeness, items } = computeProfileCompleteness({
    description: profile.description,
    headline: profile.headline,
    services: profile.services,
    location: profile.location,
    phone: profile.phone,
    images: profile.images,
    categoryCount: profile.categories.length,
  });
  return {
    user,
    profile,
    completeness,
    checklist: [{ done: !!user?.emailVerified, label: "El. paštas patvirtintas" }, ...items],
  };
}

function unreadResponseWhere(userId: string) {
  return { providerId: userId, lastMessageAt: { gt: prisma.response.fields.providerLastReadAt } };
}

function unreadInquiryWhere(userId: string) {
  return {
    providerId: userId,
    moderationStatus: "APPROVED",
    status: { not: "ARCHIVED" },
    lastMessageAt: { gt: prisma.directInquiry.fields.providerLastReadAt },
  };
}

/** Client threads with activity the provider hasn't opened yet. */
export async function getWaitingThreads(userId: string) {
  const [responseRows, inquiryRows] = await Promise.all([
    prisma.response.findMany({
      where: unreadResponseWhere(userId),
      orderBy: { lastMessageAt: "desc" },
      take: 20,
      select: {
        id: true,
        lastMessageAt: true,
        request: { select: { title: true, clientName: true } },
        messages: { select: { content: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.directInquiry.findMany({
      where: unreadInquiryWhere(userId),
      orderBy: { lastMessageAt: "desc" },
      take: 20,
      select: {
        id: true,
        lastMessageAt: true,
        description: true,
        senderName: true,
        senderEmail: true,
        messages: { select: { content: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  ]);
  return [
    ...responseRows.map((r) => ({
      key: `response-${r.id}`,
      client: r.request.clientName || "Klientas",
      about: decodeHtmlEntities(r.request.title),
      preview: r.messages[0]?.content ?? "",
      at: r.lastMessageAt,
    })),
    ...inquiryRows.map((q) => ({
      key: q.id,
      client: q.senderName?.trim() || q.senderEmail,
      about: "Žinutė iš profilio",
      preview: q.messages[0]?.content ?? q.description,
      at: q.lastMessageAt,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());
}

export type OfferState = "wait" | "talk" | "won" | "lost";

export const OFFER_STATES: { value: OfferState; label: string; chip: string }[] = [
  { value: "wait", label: "Laukia kliento", chip: "Laukia kliento" },
  { value: "talk", label: "Vyksta pokalbis", chip: "Vyksta pokalbis" },
  { value: "won", label: "Priimti", chip: "Priimtas" },
  { value: "lost", label: "Nepriimti", chip: "Nepriimtas" },
];

/**
 * Every offer the provider sent, placed in one of four states derived from
 * existing data: accepted (request.acceptedResponseId), lost (another offer
 * won or the request closed), talking (the client wrote in the thread),
 * otherwise waiting for the client.
 */
export async function getProviderOffers(userId: string) {
  const rows = await prisma.response.findMany({
    where: { providerId: userId },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true,
      price: true,
      createdAt: true,
      request: {
        select: { title: true, clientName: true, location: true, status: true, acceptedResponseId: true, updatedAt: true },
      },
      _count: { select: { messages: { where: { OR: [{ senderId: null }, { senderId: { not: userId } }] } } } },
    },
  });
  return rows.map((r) => {
    const won = r.request.acceptedResponseId === r.id;
    const state: OfferState = won
      ? "won"
      : r.request.acceptedResponseId || r.request.status === "CLOSED"
        ? "lost"
        : r._count.messages > 0
          ? "talk"
          : "wait";
    return {
      id: r.id,
      title: decodeHtmlEntities(r.request.title),
      client: r.request.clientName || "Klientas",
      city: r.request.location,
      price: r.price,
      createdAt: r.createdAt,
      state,
      /** Proxy for when the client picked this offer (the request row changed). */
      decidedAt: r.request.updatedAt,
      requestStatus: r.request.status,
    };
  });
}

export async function countOffers(userId: string) {
  return prisma.response.count({ where: { providerId: userId } });
}

export async function countUnreadThreads(userId: string) {
  const [responses, inquiries] = await Promise.all([
    prisma.response.count({ where: unreadResponseWhere(userId) }),
    prisma.directInquiry.count({ where: unreadInquiryWhere(userId) }),
  ]);
  return responses + inquiries;
}
