import { after } from "next/server";
import Image from "next/image";
import { Mail, Phone, User, Euro } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatRelativeDate } from "@/lib/utils";
import { formatLastSeen, getPresenceLevel } from "@/lib/presence";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import EmptyState from "@/components/ui/EmptyState";
import type { ThreadMessage } from "@/store/useConversationStore";
import { ArchiveButton } from "./ArchiveButton";
import { InquiryThreadChat } from "./InquiryThreadChat";

function avatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function ChatParticipantAvatar({ name, image }: { name: string; image?: string | null }) {
  return (
    <span
      className="relative inline-flex h-11 w-11 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 dark:from-brand-950 dark:to-surface-800 dark:text-brand-300"
      aria-hidden="true"
    >
      {image ? (
        <Image src={image} alt="" fill sizes="44px" className="object-cover" />
      ) : (
        <span className="grid h-full w-full place-items-center text-body-sm font-semibold">
          {avatarInitial(name)}
        </span>
      )}
    </span>
  );
}

/**
 * Streams one direct-inquiry conversation (provider view): inquiry + messages
 * in a single query, scoped to the owning provider. Marks the thread read as a
 * fire-and-forget after the response. The message input and archive action stay
 * client leaves; everything else renders on the server.
 */
export async function ThreadView({
  params,
  userId,
}: {
  params: Promise<{ id: string }>;
  userId: string;
}) {
  const { id } = await params;

  const inquiry = await prisma.directInquiry.findFirst({
    where: { id, providerId: userId },
    select: {
      id: true,
      providerId: true,
      description: true,
      budget: true,
      senderName: true,
      senderEmail: true,
      senderPhone: true,
      sender: { select: { image: true, name: true, lastSeenAt: true } },
      status: true,
      createdAt: true,
      clientLastReadAt: true,
      messages: {
        select: {
          id: true,
          content: true,
          createdAt: true,
          senderId: true,
          senderName: true,
          sender: { select: { id: true, name: true, image: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!inquiry) {
    return <EmptyState title="Žinutė nerasta" />;
  }

  // Mark this conversation read — fire-and-forget, must never break the page.
  after(async () => {
    try {
      await prisma.directInquiry.update({
        where: { id },
        data: { providerLastReadAt: new Date() },
      });
    } catch {
      // read tracking is best-effort
    }
  });

  const senderImage = inquiry.sender?.image ?? null;
  const senderAccountName = inquiry.sender?.name ?? null;
  const presenceLevel = getPresenceLevel(inquiry.sender?.lastSeenAt);
  const presenceLabel = formatLastSeen(inquiry.sender?.lastSeenAt);
  const senderDisplay =
    inquiry.senderName?.trim() || senderAccountName?.trim() || inquiry.senderEmail;
  const isArchived = inquiry.status === "ARCHIVED";

  const chatMessages: ThreadMessage[] = [
    {
      id: `opening-${inquiry.id}`,
      content: inquiry.description,
      createdAt: inquiry.createdAt.toISOString(),
      senderId: null,
      senderName: senderDisplay,
      sender: { name: senderDisplay, image: senderImage },
      metaLabel: inquiry.budget ? `Biudžetas: ${inquiry.budget}` : null,
      status: "sent",
    },
    ...inquiry.messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
      senderId: m.senderId,
      senderName: m.senderName || m.sender?.name || null,
      sender: m.sender
        ? { id: m.sender.id, name: m.sender.name ?? "", image: m.sender.image }
        : null,
      status: "sent" as const,
    })),
  ];

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="brand">Tiesioginė žinutė</Badge>
            {isArchived && <Badge variant="default">Archyvuota</Badge>}
          </div>
          <h1 className="mt-2 text-heading-1 font-bold text-surface-900 dark:text-white">
            {senderDisplay}
          </h1>
          <p className="mt-1 text-body-sm text-surface-500">
            {formatRelativeDate(inquiry.createdAt)}
          </p>
        </div>
        <ArchiveButton inquiryId={inquiry.id} status={inquiry.status} />
      </div>

      {/* Contact info */}
      <Card className="mb-6">
        <p className="mb-2 text-micro font-medium text-surface-500">Kontaktai</p>
        <div className="flex flex-wrap gap-4 text-body-sm text-surface-700 dark:text-surface-300">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-surface-400" />
            {senderDisplay}
          </span>
          <a
            href={`mailto:${inquiry.senderEmail}`}
            className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400"
          >
            <Mail className="h-4 w-4" />
            {inquiry.senderEmail}
          </a>
          {inquiry.senderPhone && (
            <a
              href={`tel:${inquiry.senderPhone}`}
              className="flex items-center gap-1.5 text-brand-600 hover:text-brand-700 dark:text-brand-400"
            >
              <Phone className="h-4 w-4" />
              {inquiry.senderPhone}
            </a>
          )}
          {inquiry.budget && (
            <span className="flex items-center gap-1.5">
              <Euro className="h-4 w-4 text-surface-400" />
              {inquiry.budget}
            </span>
          )}
        </div>
      </Card>

      {/* Conversation */}
      <Card>
        <div className="mb-4 flex items-center gap-3 border-b border-surface-200/60 pb-4 dark:border-surface-700">
          <div className="relative shrink-0 [--presence-cutout-bg:#fff] dark:[--presence-cutout-bg:#25221e]">
            <ChatParticipantAvatar name={senderDisplay} image={senderImage} />
            {presenceLevel && (
              <span
                className="pointer-events-none absolute bottom-[1px] right-[1px] flex h-[12px] w-[12px] items-center justify-center rounded-full bg-[var(--presence-cutout-bg)]"
                aria-label={presenceLabel ?? "Aktyvus neseniai"}
                title={presenceLabel ?? "Aktyvus neseniai"}
              >
                <span
                  className={`h-[7px] w-[7px] rounded-full ${
                    presenceLevel === "online" ? "bg-emerald-500" : "bg-surface-400"
                  }`}
                  aria-hidden
                />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-surface-900 dark:text-white">
              {senderDisplay}
            </p>
            <p
              className={`text-micro ${
                presenceLevel === "online"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-surface-500 dark:text-surface-400"
              }`}
            >
              {presenceLabel ?? "Klientas"}
            </p>
          </div>
        </div>

        <InquiryThreadChat
          inquiryId={inquiry.id}
          providerId={inquiry.providerId}
          initialMessages={chatMessages}
          otherParticipantName={senderDisplay}
          otherParticipantImage={senderImage}
          otherParticipantReadAt={
            inquiry.clientLastReadAt ? inquiry.clientLastReadAt.toISOString() : null
          }
        />
      </Card>
    </div>
  );
}
