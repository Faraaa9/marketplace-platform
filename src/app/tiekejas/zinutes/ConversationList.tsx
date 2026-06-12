import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";
import { getProviderAvatarImage } from "@/lib/provider-image";
import { formatLastSeen, getPresenceLevel, type PresenceLevel } from "@/lib/presence";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { MessageCircle, ChevronRight } from "lucide-react";

type InboxTab = "all" | "unread" | "archived";

type ConversationItem = {
  type: "request" | "direct";
  id: string;
  href: string;
  title: string;
  subtitle: string;
  preview: string;
  lastMessageAt: Date;
  unread: boolean;
  fromProvider: boolean;
  status: string;
  archived: boolean;
  avatarImage: string | null;
  presenceLevel: PresenceLevel;
  presenceLabel: string | null;
};

const REQUEST_STATUS: Record<
  string,
  { label: string; variant: "success" | "warning" | "default" }
> = {
  OPEN: { label: "Atidaryta", variant: "success" },
  IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
  CLOSED: { label: "Uždaryta", variant: "default" },
};

function isSenderDirectConversation(conversation: ConversationItem) {
  return conversation.type === "direct" && conversation.href.startsWith("/zinutes/");
}

function conversationRoleLabel(conversation: ConversationItem) {
  return isSenderDirectConversation(conversation) ? "Tiekėjas" : "Klientas";
}

function conversationBadgeLabel(conversation: ConversationItem) {
  if (conversation.archived) return "Archyvas";
  if (conversation.unread) return "Nauja žinutė";
  if (conversation.type === "request") {
    if (conversation.status === "IN_PROGRESS") return "Priimta";
    if (conversation.status === "CLOSED") return "Archyvas";
    return "Pasiūlymas";
  }
  return null;
}

function shouldShowSubtitle(title: string, subtitle: string) {
  if (!subtitle) return false;
  return !(title && subtitle.includes("@"));
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

function ConversationAvatar({
  name,
  image,
  presenceLevel,
  presenceLabel,
}: {
  name: string;
  image?: string | null;
  presenceLevel?: PresenceLevel;
  presenceLabel?: string | null;
}) {
  return (
    <div className="relative shrink-0" title={presenceLabel || undefined}>
      <div className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-surface-0/40 text-caption font-semibold text-surface-900 ring-1 ring-surface-0">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={40}
            height={40}
            sizes="40px"
            className="h-full w-full object-cover"
          />
        ) : (
          initials(name)
        )}
      </div>
      {presenceLevel && (
        <span
          className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white ${
            presenceLevel === "online" ? "bg-emerald-500" : "bg-brand-300"
          }`}
          aria-label={presenceLabel || (presenceLevel === "online" ? "Prisijungęs" : "Neseniai aktyvus")}
        />
      )}
    </div>
  );
}

/**
 * Unified provider inbox — request conversations (Response threads) and direct
 * inquiries merged into one list, newest activity first. A thread is unread when
 * its last activity is newer than the provider's last read time.
 */
async function getConversations(providerId: string): Promise<ConversationItem[]> {
  const [responses, inquiries] = await Promise.all([
    prisma.response.findMany({
      where: { providerId },
      select: {
        id: true,
        message: true,
        lastMessageAt: true,
        providerLastReadAt: true,
        request: { select: { id: true, title: true, status: true, clientName: true, client: { select: { image: true, lastSeenAt: true } } } },
        messages: {
          select: { content: true, createdAt: true, senderId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
    prisma.directInquiry.findMany({
      where: {
        OR: [{ providerId }, { senderUserId: providerId }],
        moderationStatus: "APPROVED",
      },
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
        provider: {
          select: {
            name: true,
            image: true,
            lastSeenAt: true,
            providerProfile: { select: { images: true, heroImageUrl: true } },
          },
        },
        sender: { select: { image: true, lastSeenAt: true } },
        messages: {
          select: { content: true, createdAt: true, senderId: true },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    }),
  ]);

  const requestItems: ConversationItem[] = responses.map((r) => {
    const last = r.messages[0] ?? null;
    return {
      type: "request",
      id: r.id,
      href: `/tiekejas/zinutes/response-${r.id}`,
      title: r.request.title,
      subtitle: r.request.clientName,
      // No chat messages yet -> preview the offer (always the provider's).
      preview: last ? last.content : r.message,
      lastMessageAt: r.lastMessageAt,
      unread: r.lastMessageAt > r.providerLastReadAt,
      fromProvider: last ? last.senderId === providerId : true,
      status: r.request.status,
      archived: false,
      avatarImage: r.request.client?.image ?? null,
      presenceLevel: getPresenceLevel(r.request.client?.lastSeenAt),
      presenceLabel: formatLastSeen(r.request.client?.lastSeenAt),
    };
  });

  const directItems: ConversationItem[] = inquiries.map((q) => {
    const last = q.messages[0] ?? null;
    const viewerIsProvider = q.providerId === providerId;
    // Outgoing direct inquiry (provider acting as sender) lives at the
    // tracking-token route; incoming lives in the provider inbox detail.
    const href = viewerIsProvider
      ? `/tiekejas/zinutes/${q.id}`
      : `/zinutes/${q.trackingToken}`;
    const senderName = q.senderName?.trim() || "";
    const title = viewerIsProvider
      ? senderName || q.senderEmail
      : q.provider.name || "Tiekėjas";
    const subtitle = viewerIsProvider ? (senderName ? "" : q.senderEmail) : "Mano išsiųsta žinutė";
    const lastReadAt = viewerIsProvider ? q.providerLastReadAt : q.clientLastReadAt;
    return {
      type: "direct",
      id: q.id,
      href,
      title,
      subtitle,
      // No chat messages yet -> preview the opening inquiry.
      preview: last ? last.content : q.description,
      lastMessageAt: q.lastMessageAt,
      unread: lastReadAt ? q.lastMessageAt > lastReadAt : !viewerIsProvider,
      fromProvider: last ? last.senderId === providerId : viewerIsProvider,
      status: q.status,
      archived: q.status === "ARCHIVED",
      avatarImage: viewerIsProvider ? q.sender?.image ?? null : getProviderAvatarImage(q.provider),
      presenceLevel: viewerIsProvider ? getPresenceLevel(q.sender?.lastSeenAt) : getPresenceLevel(q.provider.lastSeenAt),
      presenceLabel: viewerIsProvider ? formatLastSeen(q.sender?.lastSeenAt) : formatLastSeen(q.provider.lastSeenAt),
    };
  });

  return [...requestItems, ...directItems].sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
  );
}

export async function ConversationList({
  userId,
  searchParams,
  activeHref,
  compact = false,
}: {
  userId: string;
  searchParams: Promise<{ tab?: string }>;
  activeHref?: string;
  compact?: boolean;
}) {
  const { tab } = await searchParams;
  const filter: InboxTab = tab === "unread" || tab === "archived" ? tab : "all";

  const conversations = await getConversations(userId);
  const filtered =
    filter === "archived"
      ? conversations.filter((c) => c.archived)
      : filter === "unread"
        ? conversations.filter((c) => c.unread && !c.archived)
        : conversations.filter((c) => !c.archived);

  if (filtered.length === 0) {
    return (
      <EmptyState
        title={
          filter === "archived"
            ? "Archyve tuščia"
            : filter === "unread"
              ? "Neperskaitytų žinučių nėra"
              : "Žinučių dar nėra"
        }
        description={
          filter === "archived"
            ? "Archyvuoti pokalbiai atsiras čia."
            : filter === "unread"
              ? "Visos žinutės perskaitytos."
              : "Kai gausite užklausą ar tiesioginę žinutę iš kliento, pokalbiai atsiras čia."
        }
        icon={<MessageCircle className="h-12 w-12" />}
      />
    );
  }

  return (
    <div>
      {filtered.map((c) => {
        const reqStatus =
          c.type === "request"
            ? REQUEST_STATUS[c.status] || REQUEST_STATUS.OPEN
            : null;
        const highlight = c.unread && !c.archived;
        return (
          <Link key={`${c.type}-${c.id}`} href={c.href} className="group block">
            <article
              className={`relative border-b border-surface-100 bg-white transition-colors hover:bg-brand-50 dark:border-surface-700/60 dark:bg-surface-900/50 dark:hover:bg-surface-800/70 ${
                compact ? "p-3" : "p-4 sm:p-5"
              } ${
                activeHref === c.href
                  ? "bg-brand-50 dark:border-surface-700 dark:bg-surface-800/70"
                  : highlight
                  ? "bg-surface-0/40 dark:border-brand-800/40"
                  : "bg-white dark:border-surface-700/50"
              }`}
            >
              {activeHref === c.href && <span className="hidden" aria-hidden="true" />}
              <div className="flex items-start gap-3">
                <div className="relative shrink-0">
                  <ConversationAvatar
                    name={c.title}
                    image={c.avatarImage}
                    presenceLevel={c.presenceLevel}
                    presenceLabel={c.presenceLabel}
                  />
                  {highlight && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-300" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <h3
                      className={`min-w-0 flex-1 truncate text-body-sm ${
                        highlight
                          ? "font-semibold text-surface-900 dark:text-white"
                          : "font-semibold text-surface-900 dark:text-surface-200"
                      }`}
                    >
                      {decodeHtmlEntities(c.title)}
                    </h3>
                    <time className="ml-auto shrink-0 text-right text-micro font-medium leading-5 text-surface-500" dateTime={c.lastMessageAt.toISOString()}>
                      {formatRelativeDate(c.lastMessageAt)}
                    </time>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      {shouldShowSubtitle(c.title, c.subtitle) && (
                        <p className="truncate text-micro font-normal text-surface-500">
                          {decodeHtmlEntities(c.subtitle)}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Badge variant="default">{conversationRoleLabel(c)}</Badge>
                      {conversationBadgeLabel(c) ? (
                        <Badge variant={reqStatus?.variant ?? "brand"}>{conversationBadgeLabel(c)}</Badge>
                      ) : null}
                    </div>
                  </div>
                  <p
                    className={`mt-1 line-clamp-1 text-body-sm font-normal ${
                      highlight
                        ? "text-surface-500 dark:text-surface-300"
                        : "text-surface-500 dark:text-surface-400"
                    }`}
                  >
                    {c.fromProvider && <span>Jūs: </span>}
                    {decodeHtmlEntities(c.preview)}
                  </p>
                </div>
                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-surface-300 transition-colors group-hover:text-surface-400 dark:text-surface-600" />
              </div>
            </article>
          </Link>
        );
      })}
    </div>
  );
}
