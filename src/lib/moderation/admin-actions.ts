import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";
import { writeModerationLog } from "./log";

export const MODERATION_TYPES = ["request", "profile", "story", "review", "inquiry"] as const;
export type ModerationType = (typeof MODERATION_TYPES)[number];

export const MODERATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type ModerationStatus = (typeof MODERATION_STATUSES)[number];

export function isModerationType(value: string): value is ModerationType {
  return (MODERATION_TYPES as readonly string[]).includes(value);
}

export function isModerationStatus(value: string): value is ModerationStatus {
  return (MODERATION_STATUSES as readonly string[]).includes(value);
}

const TYPE_LABELS: Record<ModerationType, string> = {
  request: "Skelbimas",
  profile: "Profilis",
  story: "Story",
  review: "Atsiliepimas",
  inquiry: "Užklausimas",
};

export interface ModerationQueueItem {
  type: ModerationType;
  typeLabel: string;
  id: string;
  title: string;
  excerpt: string;
  moderationStatus: string;
  moderationReason: string | null;
  submittedBy: string;
  createdAt: string;
  previewImageUrl?: string | null;
}

const PER_TYPE_FETCH_CAP = 200;

async function fetchByType(
  type: ModerationType,
  status: ModerationStatus,
): Promise<ModerationQueueItem[]> {
  const where = { moderationStatus: status };
  const orderBy = { createdAt: "desc" as const };
  const take = PER_TYPE_FETCH_CAP;

  if (type === "request") {
    const rows = await prisma.serviceRequest.findMany({
      where,
      orderBy,
      take,
      select: {
        id: true,
        title: true,
        description: true,
        clientName: true,
        clientEmail: true,
        moderationStatus: true,
        moderationReason: true,
        createdAt: true,
      },
    });
    return rows.map((r) => ({
      type,
      typeLabel: TYPE_LABELS.request,
      id: r.id,
      title: r.title,
      excerpt: r.description,
      moderationStatus: r.moderationStatus,
      moderationReason: r.moderationReason,
      submittedBy: r.clientName || r.clientEmail,
      createdAt: r.createdAt.toISOString(),
    }));
  }

  if (type === "profile") {
    const rows = await prisma.providerProfile.findMany({
      where,
      orderBy,
      take,
      select: {
        id: true,
        headline: true,
        description: true,
        moderationStatus: true,
        moderationReason: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
    });
    return rows.map((r) => ({
      type,
      typeLabel: TYPE_LABELS.profile,
      id: r.id,
      title: r.headline || "Tiekėjo profilis",
      excerpt: r.description ?? "",
      moderationStatus: r.moderationStatus,
      moderationReason: r.moderationReason,
      submittedBy: r.user?.name || r.user?.email || "—",
      createdAt: r.createdAt.toISOString(),
    }));
  }

  if (type === "story") {
    const rows = await prisma.providerStory.findMany({
      where,
      orderBy,
      take,
      select: {
        id: true,
        text: true,
        imageUrl: true,
        moderationStatus: true,
        moderationReason: true,
        createdAt: true,
        provider: { select: { name: true, email: true } },
      },
    });
    return rows.map((r) => ({
      type,
      typeLabel: TYPE_LABELS.story,
      id: r.id,
      title: "Story",
      excerpt: r.text ?? "(be teksto)",
      moderationStatus: r.moderationStatus,
      moderationReason: r.moderationReason,
      submittedBy: r.provider?.name || r.provider?.email || "—",
      createdAt: r.createdAt.toISOString(),
      previewImageUrl: r.imageUrl,
    }));
  }

  if (type === "review") {
    const rows = await prisma.review.findMany({
      where,
      orderBy,
      take,
      select: {
        id: true,
        rating: true,
        comment: true,
        moderationStatus: true,
        moderationReason: true,
        createdAt: true,
        client: { select: { name: true } },
      },
    });
    return rows.map((r) => ({
      type,
      typeLabel: TYPE_LABELS.review,
      id: r.id,
      title: `Atsiliepimas — ${r.rating}/5`,
      excerpt: r.comment ?? "(be komentaro)",
      moderationStatus: r.moderationStatus,
      moderationReason: r.moderationReason,
      submittedBy: r.client?.name || "Svečias",
      createdAt: r.createdAt.toISOString(),
    }));
  }

  const rows = await prisma.directInquiry.findMany({
    where,
    orderBy,
    take,
    select: {
      id: true,
      description: true,
      senderName: true,
      senderEmail: true,
      moderationStatus: true,
      moderationReason: true,
      createdAt: true,
    },
  });
  return rows.map((r) => ({
    type,
    typeLabel: TYPE_LABELS.inquiry,
    id: r.id,
    title: "Tiesioginė užklausa",
    excerpt: r.description,
    moderationStatus: r.moderationStatus,
    moderationReason: r.moderationReason,
    submittedBy: r.senderName || r.senderEmail,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Lists moderation items across one or all content types, merged and paginated.
 * Volume in the queue is low, so merging + in-memory pagination is fine.
 */
export async function listModeration(opts: {
  type: ModerationType | null;
  status: ModerationStatus;
  page: number;
  perPage: number;
}): Promise<{ items: ModerationQueueItem[]; total: number }> {
  const types = opts.type ? [opts.type] : [...MODERATION_TYPES];
  const groups = await Promise.all(types.map((t) => fetchByType(t, opts.status)));
  const all = groups.flat().sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const start = (opts.page - 1) * opts.perPage;
  return { items: all.slice(start, start + opts.perPage), total: all.length };
}

/** Total PENDING items across every moderated content type — for the admin badge. */
export async function countPendingModeration(): Promise<number> {
  const where = { moderationStatus: "PENDING" };
  const [a, b, c, d, e] = await Promise.all([
    prisma.serviceRequest.count({ where }),
    prisma.providerProfile.count({ where }),
    prisma.providerStory.count({ where }),
    prisma.review.count({ where }),
    prisma.directInquiry.count({ where }),
  ]);
  return a + b + c + d + e;
}

/**
 * Applies an admin moderation decision. `data` is shared across models — all
 * five carry identical moderation columns. Returns NOT_FOUND if the id is gone.
 */
export async function moderateEntity(
  type: ModerationType,
  id: string,
  action: "approve" | "reject",
  adminId: string,
  reviewNotes?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const notes = reviewNotes?.trim() || undefined;
  const data = {
    moderationStatus: action === "approve" ? "APPROVED" : "REJECTED",
    moderationReason: action === "reject" ? (notes ?? "Atmesta administratoriaus.") : null,
    moderatedAt: new Date(),
  };

  try {
    switch (type) {
      case "request":
        await prisma.serviceRequest.update({ where: { id }, data });
        break;
      case "profile":
        await prisma.providerProfile.update({ where: { id }, data });
        break;
      case "story":
        await prisma.providerStory.update({ where: { id }, data });
        break;
      case "review":
        await prisma.review.update({ where: { id }, data });
        break;
      case "inquiry":
        await prisma.directInquiry.update({ where: { id }, data });
        break;
    }
  } catch {
    return { ok: false, error: "NOT_FOUND" };
  }

  await writeModerationLog({
    entityType: type,
    entityId: id,
    verdict: action === "approve" ? "ok" : "reject",
    source: "admin",
    reason: notes ?? null,
    actorUserId: adminId,
  });

  // An approved request becomes publicly visible — refresh cached request views.
  if (type === "request" && action === "approve") {
    revalidateTag("requests", { expire: 0 });
  }

  return { ok: true };
}
