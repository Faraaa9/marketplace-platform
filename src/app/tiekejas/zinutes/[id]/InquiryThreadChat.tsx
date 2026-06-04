"use client";

import { useCallback } from "react";
import { useSession } from "next-auth/react";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import type { RequestBrief } from "@/components/messaging/RequestBriefDrawer";

/**
 * Client leaf around ThreadChat for a provider direct-inquiry thread. Owns the
 * message-send call and pulls the current sender name from the session;
 * everything visible hydrates from the server-fetched initial messages.
 */
export function InquiryThreadChat({
  inquiryId,
  providerId,
  initialMessages,
  otherParticipantName,
  otherParticipantImage,
  otherParticipantReadAt,
  requestBrief,
  fillHeight = false,
}: {
  inquiryId: string;
  providerId: string;
  initialMessages: ThreadMessage[];
  otherParticipantName: string;
  otherParticipantImage: string | null;
  otherParticipantReadAt: string | null;
  requestBrief?: RequestBrief | null;
  fillHeight?: boolean;
}) {
  const { data: session } = useSession();

  const sendMessage = useCallback(
    async (threadId: string, content: string): Promise<ThreadMessage> => {
      const res = await fetch(`/api/tiekejas/zinutes/${threadId}/messages`, {
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
      threadId={inquiryId}
      threadKind="directInquiry"
      initialMessages={initialMessages}
      currentSenderName={session?.user?.name || "Tiekėjas"}
      viewerRole="provider"
      providerId={providerId}
      otherParticipantName={otherParticipantName}
      otherParticipantImage={otherParticipantImage}
      otherParticipantReadAt={otherParticipantReadAt}
      requestBrief={requestBrief}
      fillHeight={fillHeight}
      showInitialTimeDivider={false}
      forceDividerAfterFirstGroup
      showTopBorder={false}
      sendMessage={sendMessage}
      placeholder="Rašyti žinutę..."
    />
  );
}
