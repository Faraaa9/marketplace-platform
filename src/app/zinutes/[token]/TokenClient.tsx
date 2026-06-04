"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import type { PresenceLevel } from "@/lib/presence";
import { MessageCircle } from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  senderId?: string | null;
  senderName?: string;
  sender?: { id?: string; name: string; image?: string | null };
}

interface ConversationData {
  id: string;
  providerId: string;
  providerName: string | null;
  providerImage: string | null;
  presenceLevel: PresenceLevel;
  presenceLabel: string | null;
  description: string;
  budget: string | null;
  senderName: string | null;
  createdAt: string;
  providerLastReadAt: string | null;
  clientLastReadAt: string | null;
  hasMoreMessages?: boolean;
  messages: MessageData[];
}

export default function InquiryConversationClient() {
  const params = useParams();
  const [conversation, setConversation] = useState<ConversationData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConversation = useCallback(async () => {
    try {
      const res = await fetch(`/api/zinutes/${params.token}`);
      const data = await res.json();
      if (data.success) setConversation(data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [params.token]);

  useEffect(() => {
    // eslint-disable-next-line
    fetchConversation();
  }, [fetchConversation]);

  const sendMessage = useCallback(
    async (_threadId: string, content: string): Promise<ThreadMessage> => {
      const res = await fetch(`/api/zinutes/${params.token}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Klaida");
      return {
        id: data.data.id,
        content: data.data.content,
        createdAt: data.data.createdAt,
        senderId: data.data.senderId ?? null,
        senderName: data.data.senderName,
        sender: data.data.sender,
        status: "sent",
      };
    },
    [params.token]
  );

  const loadOlderMessages = useCallback(
    async (beforeCreatedAt: string): Promise<{ messages: ThreadMessage[]; hasMoreMessages: boolean }> => {
      const res = await fetch(`/api/zinutes/${params.token}?before=${encodeURIComponent(beforeCreatedAt)}`);
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { messages: MessageData[]; hasMoreMessages?: boolean };
      };
      if (!data.success || !data.data) throw new Error(data.error || "Klaida");
      return {
        hasMoreMessages: data.data.hasMoreMessages ?? false,
        messages: data.data.messages.map((m) => ({
          ...m,
          senderName: m.senderName || m.sender?.name || null,
          status: "sent" as const,
        })),
      };
    },
    [params.token],
  );

  if (loading) return <LoadingSpinner />;
  if (!conversation) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Pokalbis nerastas"
          description="Nuoroda neteisinga arba pokalbis nebepasiekiamas."
          icon={<MessageCircle className="h-12 w-12" />}
        />
      </div>
    );
  }

  const providerName = conversation.providerName || "Tiekėjas";
  const chatMessages: ThreadMessage[] = [
    {
      id: `opening-${conversation.id}`,
      content: conversation.description,
      createdAt: conversation.createdAt,
      senderId: null,
      senderName: conversation.senderName || "Jūs",
      sender: { name: conversation.senderName || "Jūs" },
      metaLabel: conversation.budget ? `Biudžetas: ${conversation.budget}` : null,
      status: "sent",
    },
    ...conversation.messages.map((m) => ({
      ...m,
      senderName: m.senderName || m.sender?.name || null,
      status: "sent" as const,
    })),
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Pokalbis su {providerName}
        </h1>
        <p className="mt-1 text-body-sm text-surface-500">Jūsų tiesioginė žinutė tiekėjui</p>
      </div>

      <Card>
        {/* Provider header inside the chat card — always visible */}
        <div className="mb-4 flex items-center gap-3 border-b border-surface-200/60 pb-4 dark:border-surface-700">
          <div className="relative shrink-0 [--presence-cutout-bg:#fff] dark:[--presence-cutout-bg:#25221e]">
            <div className="relative h-11 w-11 overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950 dark:to-surface-800">
              {conversation.providerImage ? (
                <Image
                  src={conversation.providerImage}
                  alt={providerName}
                  width={44}
                  height={44}
                  sizes="44px"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-body-sm font-semibold text-brand-700 dark:text-brand-300">
                  {providerName[0]?.toUpperCase() ?? "T"}
                </span>
              )}
            </div>
            {conversation.presenceLevel && (
              <span
                className="pointer-events-none absolute bottom-[1px] right-[1px] flex h-[12px] w-[12px] items-center justify-center rounded-full bg-[var(--presence-cutout-bg)]"
                aria-label={conversation.presenceLabel ?? "Aktyvus neseniai"}
                title={conversation.presenceLabel ?? "Aktyvus neseniai"}
              >
                <span
                  className={`h-[7px] w-[7px] rounded-full ${
                    conversation.presenceLevel === "online" ? "bg-emerald-500" : "bg-surface-400"
                  }`}
                  aria-hidden
                />
              </span>
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body font-semibold text-surface-900 dark:text-white">
              {providerName}
            </p>
            {conversation.presenceLabel && (
              <p
                className={`text-micro ${
                  conversation.presenceLevel === "online"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-surface-500 dark:text-surface-400"
                }`}
              >
                {conversation.presenceLabel}
              </p>
            )}
          </div>
        </div>

        <ThreadChat
          threadId={conversation.id}
          threadKind="directInquiry"
          initialMessages={chatMessages}
          currentSenderName={conversation.senderName || "Jūs"}
          viewerRole="client"
          providerId={conversation.providerId}
          otherParticipantName={providerName}
          otherParticipantImage={conversation.providerImage}
          otherParticipantReadAt={conversation.providerLastReadAt}
          realtimeTrackingToken={params.token as string}
          showInitialTimeDivider={false}
          forceDividerAfterFirstGroup
          showTopBorder={false}
          hasMoreMessages={conversation.hasMoreMessages}
          loadOlderMessages={loadOlderMessages}
          sendMessage={sendMessage}
          placeholder="Rašyti žinutę tiekėjui..."
        />
      </Card>
    </div>
  );
}
