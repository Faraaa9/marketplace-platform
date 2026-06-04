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
import ResponseThread from "../../uzklausos/[id]/ResponseThread";

function avatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function ChatParticipantAvatar({ name, image }: { name: string; image?: string | null }) {
  return (
    <span
      className="relative inline-flex h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#ece9e2]/40 text-[#3D3A35] ring-1 ring-[#ece9e2] dark:bg-brand-500/10 dark:text-brand-300"
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
  inboxLayout = false,
}: {
  params: Promise<{ id: string }>;
  userId: string;
  inboxLayout?: boolean;
}) {
  const { id } = await params;

  if (id.startsWith("response-")) {
    const responseId = id.replace(/^response-/, "");
    const response = await prisma.response.findFirst({
      where: { id: responseId, providerId: userId },
      select: {
        id: true,
        message: true,
        price: true,
        createdAt: true,
        clientLastReadAt: true,
        provider: { select: { id: true, name: true } },
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
        request: {
          select: {
            title: true,
            description: true,
            category: true,
            location: true,
            budget: true,
            deadline: true,
            createdAt: true,
            attachmentUrls: true,
            clientName: true,
            client: { select: { image: true } },
            categoryRef: { select: { name: true } },
            categories: { select: { category: { select: { name: true } } } },
            _count: { select: { responses: true } },
            status: true,
          },
        },
      },
    });

    if (!response) {
      return <EmptyState title="Pokalbis nerastas" />;
    }

    after(async () => {
      try {
        await prisma.response.update({
          where: { id: response.id },
          data: { providerLastReadAt: new Date() },
        });
      } catch {
        // read tracking is best-effort
      }
    });

    const categoryNames = response.request.categories.map((c) => c.category.name);
    const requestBrief = {
      title: response.request.title,
      description: response.request.description,
      categoryLabel: categoryNames[0] || response.request.categoryRef?.name || response.request.category,
      location: response.request.location,
      budget: response.request.budget,
      deadline: response.request.deadline,
      createdAt: response.request.createdAt.toISOString(),
      responseCount: response.request._count.responses,
      attachmentCount: response.request.attachmentUrls.length,
    };
    const initialMessages: ThreadMessage[] = [
      {
        id: `response-${response.id}`,
        content: response.message,
        createdAt: response.createdAt.toISOString(),
        senderId: response.provider.id,
        senderName: response.provider.name,
        sender: { id: response.provider.id, name: response.provider.name ?? "", image: null },
        metaLabel: formatRelativeDate(response.createdAt),
        status: "sent",
      },
      ...response.messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
        senderId: m.senderId,
        senderName: m.senderName ?? m.sender?.name ?? null,
        sender: m.sender ? { id: m.sender.id, name: m.sender.name ?? "", image: m.sender.image } : null,
        status: "sent" as const,
      })),
    ];

    return (
      <div className={inboxLayout ? "flex h-full min-h-0 flex-col" : undefined}>
        <div className={inboxLayout ? "flex min-h-[72px] items-center justify-between gap-3 border-b border-[#ece9e2] bg-white px-5 dark:border-surface-700/60" : "mb-6 flex items-start justify-between gap-3"}>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Badge variant="brand">Užklausa</Badge>
              <Badge variant={response.request.status === "OPEN" ? "success" : response.request.status === "IN_PROGRESS" ? "warning" : "default"}>
                {response.request.status === "OPEN" ? "Atidaryta" : response.request.status === "IN_PROGRESS" ? "Vykdoma" : "Uždaryta"}
              </Badge>
            </div>
            <h1 className={inboxLayout ? "text-body font-semibold text-[#1E1B18] dark:text-white" : "mt-2 text-heading-1 font-bold text-[#1E1B18] dark:text-white"}>
              {response.request.title}
            </h1>
            <p className="mt-1 text-body-sm text-[#6B6760]">
              {response.request.clientName}
            </p>
          </div>
        </div>

        <div
          className={inboxLayout ? "flex min-h-0 flex-1 flex-col bg-[#fcfbf8] px-5 py-4" : "rounded-2xl border border-[#ece9e2] bg-[#fcfbf8] p-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:border-surface-700/50 dark:bg-surface-900/50"}
        >
          <ResponseThread
            responseId={response.id}
            initialMessages={initialMessages}
            currentSenderName={response.provider.name || "Tiekėjas"}
            providerId={response.provider.id}
            otherParticipantName={response.request.clientName}
            otherParticipantImage={response.request.client?.image}
            otherParticipantReadAt={response.clientLastReadAt ? response.clientLastReadAt.toISOString() : null}
            disabled={response.request.status === "CLOSED"}
            requestBrief={requestBrief}
            fillHeight={inboxLayout}
          />
        </div>
      </div>
    );
  }

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
  const requestBrief = {
    title: "Tiesioginė užklausa",
    description: inquiry.description,
    categoryLabel: "Tiesioginė žinutė",
    budget: inquiry.budget,
    createdAt: inquiry.createdAt.toISOString(),
  };

  const chatMessages: ThreadMessage[] = [
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
      <div className={inboxLayout ? "flex h-full min-h-0 flex-col" : undefined}>
      <div className={inboxLayout ? "flex min-h-[72px] items-center justify-between gap-3 border-b border-[#ece9e2] bg-white px-5 dark:border-surface-700/60" : "mb-6 flex items-start justify-between gap-3"}>
        <div>
          <div className="mb-1 flex items-center gap-2">
            <Badge variant="brand">Tiesioginė žinutė</Badge>
            {isArchived && <Badge variant="default">Archyvuota</Badge>}
          </div>
          <h1 className={inboxLayout ? "text-body font-semibold text-[#1E1B18] dark:text-white" : "mt-2 text-heading-1 font-bold text-[#1E1B18] dark:text-white"}>
            {senderDisplay}
          </h1>
          <p className="mt-1 text-body-sm text-[#6B6760]">
            {formatRelativeDate(inquiry.createdAt)}
          </p>
        </div>
        <ArchiveButton inquiryId={inquiry.id} status={inquiry.status} />
      </div>

      {/* Contact info */}
      {!inboxLayout && <Card className="mb-6">
        <p className="mb-2 text-micro font-medium text-surface-500">Kontaktai</p>
        <div className="flex flex-wrap gap-4 text-body-sm text-surface-700 dark:text-surface-300">
          <span className="flex items-center gap-1.5">
            <User className="h-4 w-4 text-surface-400" />
            {senderDisplay}
          </span>
          <a
            href={`mailto:${inquiry.senderEmail}`}
            className="flex items-center gap-1.5 text-[#C29B74] hover:text-[#1E1B18] dark:text-brand-400"
          >
            <Mail className="h-4 w-4" />
            {inquiry.senderEmail}
          </a>
          {inquiry.senderPhone && (
            <a
              href={`tel:${inquiry.senderPhone}`}
              className="flex items-center gap-1.5 text-[#C29B74] hover:text-[#1E1B18] dark:text-brand-400"
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
      </Card>}

      {/* Conversation */}
      <div
        className={inboxLayout ? "flex min-h-0 flex-1 flex-col bg-[#fcfbf8] px-5 py-4" : "rounded-2xl border border-[#ece9e2] bg-[#fcfbf8] p-6 shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:border-surface-700/50 dark:bg-surface-900/50"}
      >
        {!inboxLayout && <div className="mb-4 flex items-center gap-3 border-b border-[#ece9e2] pb-4 dark:border-surface-700">
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
                    presenceLevel === "online" ? "bg-brand-500" : "bg-surface-400"
                  }`}
                  aria-hidden
                />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-[#1E1B18] dark:text-white">
              {senderDisplay}
            </p>
            <p
              className={`text-micro ${
                presenceLevel === "online"
                  ? "text-[#C29B74] dark:text-brand-400"
                  : "text-[#6B6760] dark:text-surface-400"
              }`}
            >
              {presenceLabel ?? "Klientas"}
            </p>
          </div>
        </div>}

        <InquiryThreadChat
          inquiryId={inquiry.id}
          providerId={inquiry.providerId}
          initialMessages={chatMessages}
          otherParticipantName={senderDisplay}
          otherParticipantImage={senderImage}
          otherParticipantReadAt={
            inquiry.clientLastReadAt ? inquiry.clientLastReadAt.toISOString() : null
          }
          requestBrief={requestBrief}
          fillHeight={inboxLayout}
        />
      </div>
    </div>
  );
}
