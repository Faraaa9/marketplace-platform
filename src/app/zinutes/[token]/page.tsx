"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { formatRelativeDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import { MessageCircle } from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  senderId?: string | null;
  senderName?: string;
  sender?: { name: string };
}

interface ConversationData {
  id: string;
  providerId: string;
  providerName: string | null;
  description: string;
  budget: string | null;
  senderName: string | null;
  createdAt: string;
  messages: MessageData[];
}

export default function InquiryConversationPage() {
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Pokalbis su {providerName}
        </h1>
        <p className="mt-1 text-body-sm text-surface-500">Jūsų tiesioginė žinutė tiekėjui</p>
      </div>

      <Card>
        {/* Opening message — the sender's own inquiry */}
        <div className="flex flex-col items-end gap-0.5">
          <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-body-sm text-white whitespace-pre-wrap break-words">
            {conversation.description}
          </div>
          {conversation.budget && (
            <span className="px-1 text-micro text-surface-400">
              Biudžetas: {conversation.budget}
            </span>
          )}
          <span className="px-1 text-micro text-surface-400">
            {formatRelativeDate(conversation.createdAt)}
          </span>
        </div>

        <ThreadChat
          threadId={conversation.id}
          threadKind="directInquiry"
          initialMessages={conversation.messages.map((m) => ({
            ...m,
            senderName: m.senderName || m.sender?.name || null,
            status: "sent" as const,
          }))}
          currentSenderName={conversation.senderName || "Jūs"}
          viewerRole="client"
          providerId={conversation.providerId}
          sendMessage={sendMessage}
          placeholder="Rašyti žinutę tiekėjui..."
        />
      </Card>
    </div>
  );
}
