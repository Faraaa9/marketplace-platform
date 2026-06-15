"use client";

import { useCallback } from "react";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import type { RequestBrief } from "@/components/messaging/RequestBriefDrawer";

interface ResponseThreadProps {
  responseId: string;
  initialMessages: ThreadMessage[];
  currentSenderName: string;
  providerId: string;
  otherParticipantName?: string | null;
  otherParticipantImage?: string | null;
  otherParticipantReadAt?: string | null;
  disabled?: boolean;
  requestBrief?: RequestBrief | null;
  fillHeight?: boolean;
}

/**
 * Client leaf for a single response thread. The parent server section pre-fetches
 * the initial messages; this island owns the send mutation and ThreadChat's
 * realtime subscription so the conversation stays live after hydration.
 */
export default function ResponseThread({
  responseId,
  initialMessages,
  currentSenderName,
  providerId,
  otherParticipantName,
  otherParticipantImage,
  otherParticipantReadAt,
  disabled,
  requestBrief,
  fillHeight = false,
}: ResponseThreadProps) {
  const sendMessage = useCallback(
    async (threadId: string, content: string): Promise<ThreadMessage> => {
      const res = await fetch(`/api/requests/${threadId}/messages`, {
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
        senderId: data.data.sender?.id ?? null,
        senderName: data.data.senderName,
        sender: data.data.sender,
        status: "sent",
      };
    },
    [],
  );

  return (
    <ThreadChat
      threadId={responseId}
      threadKind="response"
      initialMessages={initialMessages}
      currentSenderName={currentSenderName}
      viewerRole="provider"
      providerId={providerId}
      otherParticipantName={otherParticipantName}
      otherParticipantImage={otherParticipantImage}
      otherParticipantReadAt={otherParticipantReadAt}
      requestBrief={requestBrief}
      fillHeight={fillHeight}
      sendMessage={sendMessage}
      placeholder="Rašyti žinutę..."
      disabled={disabled}
    />
  );
}
