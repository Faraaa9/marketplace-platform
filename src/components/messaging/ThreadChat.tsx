"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Send, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { formatRelativeDate } from "@/lib/utils";
import { useConversationStore, type ThreadMessage } from "@/store/useConversationStore";
import { authenticateRealtime, getSupabaseBrowser } from "@/lib/supabase-browser";
import Button from "@/components/ui/Button";

/** Shape of a row from the `messages` table delivered by Supabase Realtime. */
interface MessageRow {
  id: string;
  responseId: string | null;
  directInquiryId: string | null;
  senderId: string | null;
  senderName: string | null;
  content: string;
  createdAt: string;
}

const EMPTY_MESSAGES: ThreadMessage[] = [];

type ViewerRole = "provider" | "client";
type ThreadKind = "response" | "directInquiry";

interface ThreadChatProps {
  /** The thread this chat belongs to — a Response id or a DirectInquiry id. */
  threadId: string;
  /** Which kind of thread — decides the Realtime column filter. */
  threadKind: ThreadKind;
  /** Initial messages from server (hydration) */
  initialMessages: ThreadMessage[];
  /** Display name of the current sender (for optimistic messages) */
  currentSenderName: string;
  /** Which side the current viewer is on — decides left/right alignment. */
  viewerRole: ViewerRole;
  /** The provider's user id. A message is "from the provider" iff its senderId matches. */
  providerId: string;
  /** API call to send the message. Returns the server message on success. */
  sendMessage: (threadId: string, content: string) => Promise<ThreadMessage>;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state (e.g. closed request) */
  disabled?: boolean;
}

interface MessageGroup {
  isOwn: boolean;
  senderName: string;
  messages: ThreadMessage[];
}

/**
 * A message is the provider's iff its senderId equals the thread's providerId.
 * Clients are either anonymous (senderId null) or a different user, so anything
 * that is not the provider is the client. Optimistic messages (status !== "sent")
 * are always the viewer's own send.
 */
function isOwnMessage(msg: ThreadMessage, viewerRole: ViewerRole, providerId: string): boolean {
  if (msg.status !== "sent") return true;
  const senderId = msg.senderId ?? msg.sender?.id ?? null;
  const fromProvider = senderId != null && senderId === providerId;
  return fromProvider === (viewerRole === "provider");
}

export default function ThreadChat({
  threadId,
  threadKind,
  initialMessages,
  currentSenderName,
  viewerRole,
  providerId,
  sendMessage,
  placeholder = "Rašyti žinutę...",
  disabled = false,
}: ThreadChatProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const hydrateThread = useConversationStore((s) => s.hydrateThread);
  const optimisticSend = useConversationStore((s) => s.optimisticSend);
  const confirmSend = useConversationStore((s) => s.confirmSend);
  const failSend = useConversationStore((s) => s.failSend);
  const removeFailed = useConversationStore((s) => s.removeFailed);
  const appendMessageIfNew = useConversationStore((s) => s.appendMessageIfNew);
  const messages = useConversationStore((s) => s.threads[threadId]) ?? EMPTY_MESSAGES;

  // Hydrate on mount / when server data changes
  useEffect(() => {
    const serverMessages: ThreadMessage[] = initialMessages.map((m) => ({
      ...m,
      status: m.status || ("sent" as const),
    }));
    hydrateThread(threadId, serverMessages);
  }, [threadId, initialMessages, hydrateThread]);

  // Subscribe to Realtime inserts for this thread. Falls back gracefully
  // (no live updates) when Supabase env vars are missing — initial hydration
  // from the server still works.
  //
  // We await a signed JWT first so RLS on `messages` resolves the viewer to a
  // thread participant; without it the broker drops every payload.
  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    const filterColumn = threadKind === "response" ? "responseId" : "directInquiryId";
    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    (async () => {
      await authenticateRealtime();
      if (cancelled) return;

      channel = supabase
        .channel(`messages-${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `${filterColumn}=eq.${threadId}`,
          },
          (payload) => {
            const row = payload.new as MessageRow;
            appendMessageIfNew(threadId, {
              id: row.id,
              content: row.content,
              createdAt:
                typeof row.createdAt === "string"
                  ? row.createdAt
                  : new Date(row.createdAt).toISOString(),
              senderId: row.senderId,
              senderName: row.senderName,
              sender: row.senderName ? { name: row.senderName } : null,
              status: "sent",
            });
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [threadId, threadKind, appendMessageIfNew]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || disabled) return;

    setInputValue("");
    const tempId = optimisticSend(threadId, content, currentSenderName);

    try {
      const serverMsg = await sendMessage(threadId, content);
      confirmSend(threadId, tempId, serverMsg);
    } catch {
      failSend(threadId, tempId);
    }
  }, [inputValue, disabled, threadId, currentSenderName, optimisticSend, confirmSend, failSend, sendMessage]);

  const handleResend = useCallback(async (msg: ThreadMessage) => {
    // Remove the failed message and re-send
    removeFailed(threadId, msg.id);
    const tempId = optimisticSend(threadId, msg.content, currentSenderName);

    try {
      const serverMsg = await sendMessage(threadId, msg.content);
      confirmSend(threadId, tempId, serverMsg);
    } catch {
      failSend(threadId, tempId);
    }
  }, [threadId, currentSenderName, removeFailed, optimisticSend, confirmSend, failSend, sendMessage]);

  const otherFallbackName = viewerRole === "provider" ? "Klientas" : "Tiekėjas";

  // Collapse consecutive messages from the same side into groups — Messenger-style.
  const groups = useMemo<MessageGroup[]>(() => {
    const result: MessageGroup[] = [];
    for (const msg of messages) {
      const own = isOwnMessage(msg, viewerRole, providerId);
      const last = result[result.length - 1];
      if (last && last.isOwn === own) {
        last.messages.push(msg);
      } else {
        result.push({
          isOwn: own,
          senderName: msg.sender?.name || msg.senderName || otherFallbackName,
          messages: [msg],
        });
      }
    }
    return result;
  }, [messages, viewerRole, providerId, otherFallbackName]);

  return (
    <div>
      {/* Messages thread */}
      {groups.length > 0 && (
        <div className="mt-4 flex flex-col gap-3 border-t border-surface-200/60 pt-4 dark:border-surface-700">
          {groups.map((group) => {
            const lastMsg = group.messages[group.messages.length - 1];
            return (
              <div
                key={group.messages[0].id}
                className={`flex flex-col gap-0.5 ${group.isOwn ? "items-end" : "items-start"}`}
              >
                {!group.isOwn && (
                  <span className="px-1 text-micro font-medium text-surface-500 dark:text-surface-400">
                    {group.senderName}
                  </span>
                )}

                {group.messages.map((msg, mi) => {
                  const isLast = mi === group.messages.length - 1;
                  const tail = group.isOwn
                    ? isLast
                      ? "rounded-br-md"
                      : ""
                    : isLast
                      ? "rounded-bl-md"
                      : "";

                  if (msg.status === "failed") {
                    return (
                      <div key={msg.id} className="flex flex-col items-end gap-1">
                        <div
                          className={`max-w-[80%] rounded-2xl ${tail} border border-red-200 bg-red-50 px-3.5 py-2 text-body-sm text-red-700 whitespace-pre-wrap break-words dark:border-red-800 dark:bg-red-500/10 dark:text-red-300`}
                        >
                          {msg.content}
                        </div>
                        <div className="flex items-center gap-2 px-1">
                          <span className="flex items-center gap-1 text-micro text-red-600 dark:text-red-400">
                            <AlertTriangle className="h-3 w-3" />
                            Nepavyko išsiųsti
                          </span>
                          <button
                            onClick={() => handleResend(msg)}
                            className="flex items-center gap-1 text-micro font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors"
                          >
                            <RefreshCw className="h-3 w-3" />
                            Bandyti dar kartą
                          </button>
                          <button
                            onClick={() => removeFailed(threadId, msg.id)}
                            className="text-micro text-surface-400 hover:text-surface-600 dark:hover:text-surface-300 transition-colors"
                          >
                            Pašalinti
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`max-w-[80%] rounded-2xl ${tail} px-3.5 py-2 text-body-sm whitespace-pre-wrap break-words ${
                        group.isOwn
                          ? "bg-brand-600 text-white"
                          : "bg-surface-50 text-surface-700 dark:bg-surface-800 dark:text-surface-200"
                      } ${msg.status === "sending" ? "opacity-60" : ""}`}
                    >
                      {msg.content}
                    </div>
                  );
                })}

                {/* One timestamp per group — skipped when the last message failed
                    (its own status row is shown instead). */}
                {lastMsg.status !== "failed" && (
                  <span className="flex items-center gap-1 px-1 text-micro text-surface-400">
                    {lastMsg.status === "sending" ? (
                      <>
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Siunčiama...
                      </>
                    ) : (
                      formatRelativeDate(lastMsg.createdAt)
                    )}
                  </span>
                )}
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Composer */}
      {!disabled && (
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder={placeholder}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 rounded-xl border border-surface-300 bg-white px-3 py-2 text-body-sm ring-1 ring-transparent focus:border-brand-500 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
          />
          <Button size="sm" onClick={handleSend} disabled={!inputValue.trim()}>
            <Send className="h-3.5 w-3.5 mr-1" />
            Siųsti
          </Button>
        </div>
      )}
    </div>
  );
}
