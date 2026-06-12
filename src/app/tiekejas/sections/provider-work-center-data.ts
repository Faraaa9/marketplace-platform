import { prisma } from "@/lib/prisma";
import { activeCategoryFilter } from "@/lib/category-matching";
import { computeProfileCompleteness } from "@/lib/provider-completeness";
import { decodeHtmlEntities } from "@/lib/utils";

export type WorkConversation = {
  id: string;
  href: string;
  title: string;
  meta: string;
  preview: string;
  lastMessageAt: Date;
  unread: boolean;
  fromProvider: boolean;
  roleLabel: "Klientas" | "Tiekėjas";
  stateLabel: "Nauja žinutė" | "Vyksta" | "Priimta" | null;
};

export type ReadinessStep = {
  label: string;
  done: boolean;
  href: string;
};

const WORK_QUEUE_LIMIT = 4;
const DASHBOARD_THREAD_LIMIT = 50;

export function initials(name: string) {
  const parts = decodeHtmlEntities(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export function sortWorkQueue(conversations: WorkConversation[]) {
  return [...conversations].sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
  });
}

export async function getProviderWorkCenterData(userId: string) {
  const [user, profile, responses, inquiries] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, emailVerified: true },
    }),
    prisma.providerProfile.findUnique({
      where: { userId },
      select: {
        creditBalance: true,
        isActive: true,
        description: true,
        headline: true,
        services: true,
        location: true,
        phone: true,
        images: true,
        categories: { where: activeCategoryFilter(), select: { categoryId: true } },
      },
    }),
    prisma.response.findMany({
      where: { providerId: userId },
      orderBy: { lastMessageAt: "desc" },
      take: DASHBOARD_THREAD_LIMIT,
      select: {
        id: true,
        message: true,
        lastMessageAt: true,
        providerLastReadAt: true,
        request: {
          select: {
            title: true,
            location: true,
            clientName: true,
            acceptedResponseId: true,
          },
        },
        messages: {
          select: { content: true, senderId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.directInquiry.findMany({
      where: {
        OR: [{ providerId: userId }, { senderUserId: userId }],
        moderationStatus: "APPROVED",
      },
      orderBy: { lastMessageAt: "desc" },
      take: DASHBOARD_THREAD_LIMIT,
      select: {
        id: true,
        trackingToken: true,
        providerId: true,
        description: true,
        senderName: true,
        senderEmail: true,
        status: true,
        lastMessageAt: true,
        providerLastReadAt: true,
        clientLastReadAt: true,
        provider: { select: { name: true } },
        messages: {
          select: { content: true, senderId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const categoryCount = profile?.categories.length ?? 0;
  const creditBalance = profile?.creditBalance ?? 0;
  const { completeness, missingItems } = computeProfileCompleteness({
    description: profile?.description ?? null,
    headline: profile?.headline ?? null,
    services: profile?.services ?? null,
    location: profile?.location ?? null,
    phone: profile?.phone ?? null,
    images: profile?.images ?? [],
    categoryCount,
  });

  const responseConversations: WorkConversation[] = responses.map((response) => {
    const last = response.messages[0] ?? null;
    const unread = response.lastMessageAt > response.providerLastReadAt;
    const accepted = response.request.acceptedResponseId === response.id;
    return {
      id: `response-${response.id}`,
      href: `/tiekejas/zinutes?thread=response-${response.id}`,
      title: response.request.clientName || response.request.title,
      meta: `${response.request.title} · ${response.request.location}`,
      preview: last?.content ?? response.message,
      lastMessageAt: response.lastMessageAt,
      unread,
      fromProvider: last ? last.senderId === userId : true,
      roleLabel: "Klientas",
      stateLabel: unread ? "Nauja žinutė" : accepted ? "Priimta" : "Vyksta",
    };
  });

  const directConversations: WorkConversation[] = inquiries
    .filter((inquiry) => inquiry.status !== "ARCHIVED")
    .map((inquiry) => {
      const last = inquiry.messages[0] ?? null;
      const viewerIsProvider = inquiry.providerId === userId;
      const lastReadAt = viewerIsProvider ? inquiry.providerLastReadAt : inquiry.clientLastReadAt;
      const unread = lastReadAt ? inquiry.lastMessageAt > lastReadAt : !viewerIsProvider;
      const title = viewerIsProvider
        ? inquiry.senderName?.trim() || inquiry.senderEmail
        : inquiry.provider.name || "Tiekėjas";
      return {
        id: viewerIsProvider ? inquiry.id : inquiry.trackingToken,
        href: `/tiekejas/zinutes?thread=${encodeURIComponent(viewerIsProvider ? inquiry.id : inquiry.trackingToken)}`,
        title,
        meta: viewerIsProvider ? "Žinutė iš profilio" : "Mano išsiųsta žinutė",
        preview: last?.content ?? inquiry.description,
        lastMessageAt: inquiry.lastMessageAt,
        unread,
        fromProvider: last ? last.senderId === userId : !viewerIsProvider,
        roleLabel: viewerIsProvider ? "Klientas" : "Tiekėjas",
        stateLabel: unread ? "Nauja žinutė" : "Vyksta",
      };
    });

  const conversations = sortWorkQueue([...responseConversations, ...directConversations]);
  const readinessSteps: ReadinessStep[] = [
    { label: "Paskyra patvirtinta", done: !!user?.emailVerified, href: "/patvirtinti" },
    { label: "Profilis aktyvus", done: profile?.isActive ?? false, href: "/tiekejas/profilis" },
    { label: "Veiklos sritys pasirinktos", done: categoryCount > 0, href: "/tiekejas/profilis#categories" },
    { label: "Telefonas", done: !!profile?.phone, href: "/tiekejas/profilis#phone" },
  ];

  return {
    user,
    profile,
    conversations,
    workQueue: conversations.slice(0, WORK_QUEUE_LIMIT),
    unreadCount: conversations.filter((conversation) => conversation.unread).length,
    activeCount: conversations.length,
    acceptedCount: responseConversations.filter((conversation) => conversation.stateLabel === "Priimta").length,
    creditBalance,
    completeness,
    missingItems,
    readinessSteps,
    missingReadiness: readinessSteps.find((step) => !step.done),
  };
}
