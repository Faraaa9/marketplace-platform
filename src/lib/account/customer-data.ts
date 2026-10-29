import "server-only";
import { prisma } from "@/lib/prisma";
import type { AttentionItem } from "@/components/account/ui";
import { decodeHtmlEntities, ltCount } from "@/lib/utils";
import { canRate, isCustomerThreadUnread, type RequestProgressInput } from "./request-progress";

export interface CustomerRequestRow extends RequestProgressInput {
  id: string;
  trackingToken: string;
  title: string;
  location: string;
  categoryName: string;
  createdAt: Date;
}

const RESPONSE_SELECT = {
  id: true,
  price: true,
  createdAt: true,
  lastMessageAt: true,
  clientLastReadAt: true,
  providerId: true,
  provider: { select: { name: true } },
  messages: {
    select: { content: true, senderId: true },
    orderBy: { createdAt: "desc" as const },
    take: 1,
  },
} as const;

async function loadRequests(userId: string) {
  return prisma.serviceRequest.findMany({
    where: { clientId: userId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      trackingToken: true,
      title: true,
      location: true,
      status: true,
      moderationStatus: true,
      acceptedResponseId: true,
      createdAt: true,
      updatedAt: true,
      categoryRef: { select: { name: true } },
      reviews: { select: { responseId: true } },
      responses: { select: RESPONSE_SELECT, orderBy: { createdAt: "desc" } },
    },
  });
}

type LoadedRequest = Awaited<ReturnType<typeof loadRequests>>[number];

function toRow(r: LoadedRequest): CustomerRequestRow {
  return {
    id: r.id,
    trackingToken: r.trackingToken,
    title: decodeHtmlEntities(r.title),
    location: r.location,
    categoryName: r.categoryRef?.name ?? "",
    createdAt: r.createdAt,
    status: r.status,
    moderationStatus: r.moderationStatus,
    responseCount: r.responses.length,
    acceptedResponseId: r.acceptedResponseId,
    reviewed: !!r.acceptedResponseId && r.reviews.some((rv) => rv.responseId === r.acceptedResponseId),
  };
}

function formatPrice(price: number | null) {
  return price != null ? `${price.toLocaleString("lt-LT")} €` : "kaina nenurodyta";
}

/** Everything the customer home and request list need, in one pass. */
export async function getCustomerOverview(userId: string) {
  const [user, requests, inquiries] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    loadRequests(userId),
    prisma.directInquiry.findMany({
      where: { senderUserId: userId, moderationStatus: "APPROVED", status: { not: "ARCHIVED" } },
      orderBy: { lastMessageAt: "desc" },
      take: 50,
      select: {
        trackingToken: true,
        lastMessageAt: true,
        clientLastReadAt: true,
        providerId: true,
        provider: { select: { name: true } },
        messages: {
          select: { content: true, senderId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const rows = requests.map(toRow);
  const attention: AttentionItem[] = [];
  // The review form is open from the pick on, but asking right after the pick
  // means rating work that hasn't happened yet: prompt once the customer closed
  // the request, or a week after the pick.
  // ponytail: updatedAt stands in for the pick time; add acceptedAt if edits skew it.
  const rateAfter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const r of requests) {
    const row = rows.find((x) => x.id === r.id)!;
    const href = `/uzklausos/sekti/${r.trackingToken}`;
    if (r.status === "PENDING_CONFIRMATION") {
      attention.push({
        key: `confirm-${r.id}`,
        tone: "new",
        title: `Patvirtinkite el. paštą — ${row.title}`,
        detail: "Meistrai užklausą pamatys tik ją patvirtinus. Laišką galite išsiųsti iš naujo.",
        href,
        action: "Patvirtinti",
        primary: true,
      });
      continue;
    }
    if (r.status === "OPEN" && !r.acceptedResponseId) {
      const fresh = r.responses.filter((resp) => !resp.clientLastReadAt || resp.createdAt > resp.clientLastReadAt);
      if (fresh.length > 0) {
        attention.push({
          key: `offers-${r.id}`,
          tone: "new",
          title: `${fresh.length === 1 ? "Naujas pasiūlymas" : `${fresh.length} nauji pasiūlymai`} — ${row.title}`,
          detail: `${fresh
            .slice(0, 3)
            .map((resp) => `${resp.provider.name ?? "Meistras"} ${formatPrice(resp.price)}`)
            .join(" · ")} · palyginkite ir pasirinkite`,
          href,
          action: "Palyginti",
          primary: true,
        });
      }
    }
    if (r.status !== "CLOSED") {
      for (const resp of r.responses) {
        const last = resp.messages[0];
        const isNewOffer = !resp.clientLastReadAt || resp.createdAt > resp.clientLastReadAt;
        if (
          !isNewOffer &&
          last &&
          last.senderId === resp.providerId &&
          resp.clientLastReadAt &&
          resp.lastMessageAt > resp.clientLastReadAt
        ) {
          attention.push({
            key: `msg-${resp.id}`,
            tone: "msg",
            title: `${resp.provider.name ?? "Meistras"} parašė žinutę`,
            detail: `„${decodeHtmlEntities(last.content).slice(0, 140)}“`,
            href: `/paskyra/zinutes?thread=response-${resp.id}`,
            action: "Atsakyti",
          });
        }
      }
    }
    if (canRate(row) && (r.status === "CLOSED" || r.updatedAt < rateAfter)) {
      attention.push({
        key: `rate-${r.id}`,
        tone: "rate",
        title: `Įvertinkite atliktą darbą — ${row.title}`,
        detail: "Jūsų atsiliepimas padeda kitiems pasirinkti meistrą",
        href: `${href}#ivertinti`,
        action: "Įvertinti",
      });
    }
  }

  for (const q of inquiries) {
    const last = q.messages[0];
    const unread = !!last && last.senderId === q.providerId && (!q.clientLastReadAt || q.lastMessageAt > q.clientLastReadAt);
    if (!unread) continue;
    attention.push({
      key: `inq-${q.trackingToken}`,
      tone: "msg",
      title: `${q.provider.name ?? "Meistras"} parašė žinutę`,
      detail: `„${decodeHtmlEntities(last.content).slice(0, 140)}“`,
      href: `/paskyra/zinutes?thread=${q.trackingToken}`,
      action: "Atsakyti",
    });
  }

  // Same rule as /api/paskyra/zinutes so the Žinutės badge matches the inbox dots.
  const unreadThreads =
    requests.reduce(
      (n, r) =>
        n +
        r.responses.filter((resp) =>
          isCustomerThreadUnread({
            lastSenderId: resp.messages[0] ? resp.messages[0].senderId : undefined,
            providerId: resp.providerId,
            lastMessageAt: resp.lastMessageAt,
            lastReadAt: resp.clientLastReadAt,
            offerCreatedAt: resp.createdAt,
          }),
        ).length,
      0,
    ) +
    inquiries.filter((q) =>
      isCustomerThreadUnread({
        lastSenderId: q.messages[0] ? q.messages[0].senderId : undefined,
        providerId: q.providerId,
        lastMessageAt: q.lastMessageAt,
        lastReadAt: q.clientLastReadAt,
      }),
    ).length;

  const firstName = (user?.name?.trim() || user?.email?.split("@")[0] || "").split(/\s+/)[0];

  return {
    firstName,
    rows,
    active: rows.filter((r) => r.status !== "CLOSED" && r.status !== "EXPIRED"),
    closed: rows.filter((r) => r.status === "CLOSED" || r.status === "EXPIRED"),
    attention,
    unreadThreads,
  };
}

export function offersLabel(n: number) {
  return n === 0 ? "pasiūlymų dar nėra" : ltCount(n, ["pasiūlymas", "pasiūlymai", "pasiūlymų"]);
}
