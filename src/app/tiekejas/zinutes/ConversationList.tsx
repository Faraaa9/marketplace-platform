import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import { MessageCircle, Mail, ChevronRight } from "lucide-react";

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
};

const REQUEST_STATUS: Record<
  string,
  { label: string; variant: "success" | "warning" | "default" }
> = {
  OPEN: { label: "Atidaryta", variant: "success" },
  IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
  CLOSED: { label: "Uždaryta", variant: "default" },
};

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
        request: { select: { id: true, title: true, status: true, clientName: true } },
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
        provider: { select: { name: true } },
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
      href: `/tiekejas/uzklausos/${r.request.id}`,
      title: r.request.title,
      subtitle: r.request.clientName,
      // No chat messages yet -> preview the offer (always the provider's).
      preview: last ? last.content : r.message,
      lastMessageAt: r.lastMessageAt,
      unread: r.lastMessageAt > r.providerLastReadAt,
      fromProvider: last ? last.senderId === providerId : true,
      status: r.request.status,
      archived: false,
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
    const title = viewerIsProvider
      ? q.senderName?.trim() || q.senderEmail
      : q.provider.name || "Tiekėjas";
    const subtitle = viewerIsProvider ? q.senderEmail : "Mano išsiųsta žinutė";
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
    };
  });

  return [...requestItems, ...directItems].sort(
    (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
  );
}

export async function ConversationList({
  userId,
  searchParams,
}: {
  userId: string;
  searchParams: Promise<{ tab?: string }>;
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
    <div className="space-y-3">
      {filtered.map((c) => {
        const reqStatus =
          c.type === "request"
            ? REQUEST_STATUS[c.status] || REQUEST_STATUS.OPEN
            : null;
        const highlight = c.unread && !c.archived;
        return (
          <Link key={`${c.type}-${c.id}`} href={c.href} className="group block">
            <article
              className={`rounded-2xl border bg-white p-4 transition-shadow hover:shadow-md dark:bg-surface-900/50 sm:p-5 ${
                highlight
                  ? "border-brand-200/60 dark:border-brand-800/40"
                  : "border-surface-200/60 dark:border-surface-700/50"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {highlight ? (
                    <span className="block h-2.5 w-2.5 rounded-full bg-brand-500" />
                  ) : c.type === "direct" ? (
                    <Mail className="h-4 w-4 text-surface-300 dark:text-surface-600" />
                  ) : (
                    <MessageCircle className="h-4 w-4 text-surface-300 dark:text-surface-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`min-w-0 flex-1 truncate text-body-sm ${
                        highlight
                          ? "font-semibold text-surface-900 dark:text-white"
                          : "font-medium text-surface-700 dark:text-surface-300"
                      }`}
                    >
                      {c.title}
                    </h3>
                    <div className="flex shrink-0 items-center gap-1">
                      {reqStatus ? (
                        <>
                          <Badge variant="brand">Užklausa</Badge>
                          <Badge variant={reqStatus.variant}>{reqStatus.label}</Badge>
                        </>
                      ) : (
                        <Badge variant="brand">Tiesioginė</Badge>
                      )}
                    </div>
                  </div>
                  {c.subtitle && (
                    <p className="mt-0.5 truncate text-micro text-surface-400">
                      {c.subtitle}
                    </p>
                  )}
                  <p
                    className={`mt-1 line-clamp-1 text-body-sm ${
                      highlight
                        ? "text-surface-600 dark:text-surface-300"
                        : "text-surface-500 dark:text-surface-400"
                    }`}
                  >
                    {c.fromProvider && <span className="text-surface-400">Jūs: </span>}
                    {c.preview}
                  </p>
                  <p className="mt-1 text-micro text-surface-400">
                    {formatRelativeDate(c.lastMessageAt)}
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
