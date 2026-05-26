"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Image from "next/image";
import { Send, AlertTriangle, RefreshCw, Loader2 } from "lucide-react";
import { cn, formatRelativeDate } from "@/lib/utils";
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
  /** Display name for the other chat participant. Used for avatars/tooltips. */
  otherParticipantName?: string | null;
  /** Avatar for the other chat participant. */
  otherParticipantImage?: string | null;
  /** When the other participant last read this thread, if the current view can know it. */
  otherParticipantReadAt?: string | null;
  /** Draw the separator above the first rendered message group. */
  showInitialTimeDivider?: boolean;
  /** Force a timestamp before the second group, useful when an opening message is rendered as part of the thread. */
  forceDividerAfterFirstGroup?: boolean;
  /** Draw the top divider when the thread follows an opening block. */
  showTopBorder?: boolean;
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
  senderImage: string | null;
  messages: ThreadMessage[];
}

const GROUP_BREAK_MS = 5 * 60 * 1000;
const TIME_DIVIDER_MS = 15 * 60 * 1000;

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

function toTime(value: string): number {
  const time = Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function shouldBreakGroup(prev: ThreadMessage | undefined, next: ThreadMessage) {
  if (!prev) return true;
  return toTime(next.createdAt) - toTime(prev.createdAt) > GROUP_BREAK_MS;
}

function shouldShowTimeDivider(prev: MessageGroup | undefined, next: MessageGroup) {
  const first = next.messages[0];
  if (!prev) return true;
  const prevLast = prev.messages[prev.messages.length - 1];
  const gap = toTime(first.createdAt) - toTime(prevLast.createdAt);
  if (gap > TIME_DIVIDER_MS) return true;
  return new Date(first.createdAt).toDateString() !== new Date(prevLast.createdAt).toDateString();
}

function formatChatTimestamp(value: string) {
  const date = new Date(value);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();
  const time = date.toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" });

  if (isToday) return time;
  if (isYesterday) return `Vakar ${time}`;
  return `${date.toLocaleDateString("lt-LT", { month: "short", day: "numeric" })} ${time}`;
}

function avatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function ParticipantAvatar({
  name,
  image,
  size = "md",
  className,
}: {
  name: string;
  image?: string | null;
  size?: "sm" | "md";
  className?: string;
}) {
  const sizeClass = size === "sm" ? "h-5 w-5" : "h-8 w-8";
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-brand-100 text-brand-700 dark:from-brand-950 dark:to-surface-800 dark:text-brand-300",
        sizeClass,
        className,
      )}
      aria-hidden="true"
      title={name}
    >
      {image ? (
        <Image
          src={image}
          alt=""
          fill
          sizes={size === "sm" ? "20px" : "32px"}
          className="object-cover"
        />
      ) : (
        <span
          className={cn(
            "grid h-full w-full place-items-center font-semibold",
            size === "sm" ? "text-[10px]" : "text-caption",
          )}
        >
          {avatarInitial(name)}
        </span>
      )}
    </span>
  );
}

export default function ThreadChat({
  threadId,
  threadKind,
  initialMessages,
  currentSenderName,
  viewerRole,
  providerId,
  otherParticipantName,
  otherParticipantImage,
  otherParticipantReadAt,
  showInitialTimeDivider = true,
  forceDividerAfterFirstGroup = false,
  showTopBorder = true,
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
  const otherDisplayName = otherParticipantName?.trim() || otherFallbackName;
  const readAtTime = otherParticipantReadAt ? toTime(otherParticipantReadAt) : null;

  // Collapse consecutive messages from the same side into groups — Messenger-style.
  const groups = useMemo<MessageGroup[]>(() => {
    const result: MessageGroup[] = [];
    for (const msg of messages) {
      const own = isOwnMessage(msg, viewerRole, providerId);
      const last = result[result.length - 1];
      const previousMessage = last?.messages[last.messages.length - 1];
      if (last && last.isOwn === own && !shouldBreakGroup(previousMessage, msg)) {
        last.messages.push(msg);
      } else {
        result.push({
          isOwn: own,
          senderName: msg.sender?.name || msg.senderName || otherFallbackName,
          senderImage: msg.sender?.image || (!own ? otherParticipantImage || null : null),
          messages: [msg],
        });
      }
    }
    return result;
  }, [messages, viewerRole, providerId, otherFallbackName, otherParticipantImage]);

  const lastOwnSeenMessageId = useMemo(() => {
    if (!readAtTime) return null;

    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.status !== "sent") continue;
      if (!isOwnMessage(msg, viewerRole, providerId)) continue;
      return toTime(msg.createdAt) <= readAtTime ? msg.id : null;
    }

    return null;
  }, [messages, providerId, readAtTime, viewerRole]);

  return (
    <div>
      {/* Messages thread */}
      {groups.length > 0 && (
        <div
          className={cn(
            "flex flex-col gap-3",
            showTopBorder && "mt-4 border-t border-surface-200/60 pt-4 dark:border-surface-700",
          )}
        >
          {groups.map((group, groupIndex) => {
            const previousGroup = groupIndex > 0 ? groups[groupIndex - 1] : undefined;
            const lastMsg = group.messages[group.messages.length - 1];
            const showSeen = group.isOwn && lastMsg.id === lastOwnSeenMessageId;
            return (
              <div key={group.messages[0].id} className="space-y-2">
                {(groupIndex > 0 || showInitialTimeDivider) &&
                  (shouldShowTimeDivider(previousGroup, group) ||
                    (forceDividerAfterFirstGroup && groupIndex === 1)) && (
                  <div className="flex justify-center">
                    <time
                      dateTime={group.messages[0].createdAt}
                      className="rounded-full px-2 py-0.5 text-micro font-medium text-surface-400 dark:text-surface-500"
                    >
                      {formatChatTimestamp(group.messages[0].createdAt)}
                    </time>
                  </div>
                )}

                <div className={cn("flex w-full gap-2", group.isOwn ? "justify-end" : "justify-start")}>
                  {!group.isOwn && (
                    <ParticipantAvatar
                      name={group.senderName || otherDisplayName}
                      image={group.senderImage || otherParticipantImage}
                      className="mt-auto"
                    />
                  )}

                  <div
                    className={cn(
                      "flex max-w-[min(78%,30rem)] flex-col gap-0.5",
                      group.isOwn ? "items-end" : "items-start",
                    )}
                  >
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
                          <div key={msg.id} className="flex max-w-full flex-col items-end gap-1">
                            <div
                              className={cn(
                                "max-w-full rounded-3xl border border-red-200 bg-red-50 px-4 py-2.5 text-body-sm text-red-700 whitespace-pre-wrap break-words dark:border-red-800 dark:bg-red-500/10 dark:text-red-300",
                                tail,
                              )}
                              title={formatChatTimestamp(msg.createdAt)}
                            >
                              {msg.content}
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2 px-1">
                              <span className="flex items-center gap-1 text-micro text-red-600 dark:text-red-400">
                                <AlertTriangle className="h-3 w-3" />
                                Nepavyko išsiųsti
                              </span>
                              <button
                                onClick={() => handleResend(msg)}
                                className="flex min-h-8 items-center gap-1 text-micro font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                              >
                                <RefreshCw className="h-3 w-3" />
                                Bandyti dar kartą
                              </button>
                              <button
                                onClick={() => removeFailed(threadId, msg.id)}
                                className="min-h-8 text-micro text-surface-400 transition-colors hover:text-surface-600 dark:hover:text-surface-300"
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
                          className={cn(
                            "max-w-full rounded-3xl px-4 py-2.5 text-[15px] leading-snug whitespace-pre-wrap break-words",
                            group.isOwn
                              ? "bg-brand-600 text-white dark:bg-brand-500"
                              : "bg-surface-100 text-surface-900 dark:bg-surface-800 dark:text-surface-100",
                            tail,
                            msg.status === "sending" && "opacity-70",
                          )}
                          title={formatChatTimestamp(msg.createdAt)}
                        >
                          {msg.content}
                        </div>
                      );
                    })}

                    {lastMsg.status === "sending" && (
                      <span className="flex items-center gap-1 px-1 text-micro text-surface-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Siunčiama...
                      </span>
                    )}

                    {showSeen && (
                      <span className="flex min-h-5 items-center justify-end px-1" title={`Matyta ${formatRelativeDate(otherParticipantReadAt!)}`}>
                        <ParticipantAvatar
                          name={otherDisplayName}
                          image={otherParticipantImage}
                          size="sm"
                        />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Composer */}
      {!disabled && (
        <div className="mt-4 flex gap-2 border-t border-surface-200/60 pt-3 dark:border-surface-700">
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
            className="min-h-11 flex-1 rounded-full border border-surface-200 bg-surface-50 px-4 py-2 text-body-sm ring-1 ring-transparent transition-all placeholder:text-surface-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white dark:focus:bg-surface-800"
          />
          <Button
            size="sm"
            onClick={handleSend}
            disabled={!inputValue.trim()}
            aria-label="Siųsti žinutę"
            className="h-11 w-11 rounded-full px-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
