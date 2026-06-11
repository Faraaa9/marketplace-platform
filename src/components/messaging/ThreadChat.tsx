"use client";

import { Fragment, useEffect, useRef, useState, useCallback, useMemo, type CSSProperties } from "react";
import Image from "next/image";
import { ChevronUp, Send, AlertTriangle, RefreshCw, Paperclip, Smile, WifiOff } from "lucide-react";
import { cn, decodeHtmlEntities } from "@/lib/utils";
import { useConversationStore, type ThreadMessage } from "@/store/useConversationStore";
import { authenticateRealtime, getSupabaseBrowser } from "@/lib/supabase-browser";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import type { RequestBrief } from "@/components/messaging/RequestBriefDrawer";

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
  /** Tracking token for token-authenticated client threads. Session users can omit it. */
  realtimeTrackingToken?: string | null;
  /** Draw the separator above the first rendered message group. */
  showInitialTimeDivider?: boolean;
  /** @deprecated Date dividers are now rendered only once per calendar day. */
  forceDividerAfterFirstGroup?: boolean;
  /** Draw the top divider when the thread follows an opening block. */
  showTopBorder?: boolean;
  /** API call to send the message. Returns the server message on success. */
  sendMessage: (threadId: string, content: string) => Promise<ThreadMessage>;
  /** Placeholder text */
  placeholder?: string;
  /** Disabled state (e.g. closed request) */
  disabled?: boolean;
  /** Optional request preview pinned above the thread. Opens a full request drawer. */
  requestBrief?: RequestBrief | null;
  /** Fill available height and scroll only the message list. */
  fillHeight?: boolean;
  /** Optional quick reply chips above the composer. */
  quickReplies?: string[];
  /** Whether older messages exist before the initially loaded recent window. */
  hasMoreMessages?: boolean;
  /** Load older history before the currently oldest real message. */
  loadOlderMessages?: (beforeCreatedAt: string) => Promise<{
    messages: ThreadMessage[];
    hasMoreMessages: boolean;
  }>;
}

interface MessageGroup {
  isOwn: boolean;
  senderName: string;
  senderImage: string | null;
  messages: ThreadMessage[];
}

const GROUP_BREAK_MS = 5 * 60 * 1000;
const OWN_BUBBLE_STYLE: CSSProperties = {
  backgroundColor: "#8A6653",
  borderColor: "#7B5D49",
  color: "#FFFFFF",
};
const OTHER_BUBBLE_STYLE: CSSProperties = {
  backgroundColor: "#F1ECE4",
  borderColor: "#E5D9C8",
  color: "#111827",
};
const FAILED_BUBBLE_STYLE: CSSProperties = {
  backgroundColor: "#FEF2F2",
  borderColor: "#FECACA",
  color: "#991B1B",
};

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

function formatDividerDate(value: string) {
  const date = new Date(value);
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Šiandien";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Vakar";
  return date.toLocaleDateString("lt-LT", { month: "long", day: "numeric" });
}

function formatMessageTime(value: string) {
  return new Date(value).toLocaleTimeString("lt-LT", { hour: "2-digit", minute: "2-digit" });
}

function avatarInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || "?";
}

function isHistoryCursorMessage(msg: ThreadMessage) {
  return msg.status === "sent" && !msg.id.startsWith("temp-") && !msg.id.startsWith("response-") && !msg.id.startsWith("opening-");
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
  realtimeTrackingToken,
  showInitialTimeDivider = true,
  showTopBorder = true,
  sendMessage,
  placeholder = "Rašyti žinutę...",
  disabled = false,
  fillHeight = false,
  quickReplies = [],
  hasMoreMessages: initialHasMoreMessages = false,
  loadOlderMessages,
}: ThreadChatProps) {
  const [inputValue, setInputValue] = useState("");
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [isOtherOnline, setIsOtherOnline] = useState(false);
  const [currentOtherReadAt, setCurrentOtherReadAt] = useState(otherParticipantReadAt ?? null);
  const [hasMoreMessages, setHasMoreMessages] = useState(initialHasMoreMessages);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [olderLoadError, setOlderLoadError] = useState<string | null>(null);
  // Realtime connection state. We surface "degraded" to the user when Supabase
  // drops or fails to subscribe so the chat doesn't silently freeze — without
  // this banner a torn websocket looks identical to "the other side is quiet".
  const [realtimeState, setRealtimeState] = useState<
    "connecting" | "connected" | "degraded"
  >("connecting");
  const [reconnectNonce, setReconnectNonce] = useState(0);
  const messageStreamRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMarkedReadMessageIdRef = useRef<string | null>(null);
  const typingStopTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAtRef = useRef(0);
  const realtimeChannelRef = useRef<{
    send: (args: { type: "broadcast"; event: string; payload: Record<string, unknown> }) => Promise<unknown>;
  } | null>(null);

  const hydrateThread = useConversationStore((s) => s.hydrateThread);
  const optimisticSend = useConversationStore((s) => s.optimisticSend);
  const confirmSend = useConversationStore((s) => s.confirmSend);
  const failSend = useConversationStore((s) => s.failSend);
  const removeFailed = useConversationStore((s) => s.removeFailed);
  const appendMessageIfNew = useConversationStore((s) => s.appendMessageIfNew);
  const prependMessages = useConversationStore((s) => s.prependMessages);
  const messages = useConversationStore((s) => s.threads[threadId]) ?? EMPTY_MESSAGES;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncs read-receipt state when the server prop refreshes; see eslint.config.mjs note
    setCurrentOtherReadAt(otherParticipantReadAt ?? null);
  }, [otherParticipantReadAt]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets pagination state on thread switch; see eslint.config.mjs note
    setHasMoreMessages(initialHasMoreMessages);
    setOlderLoadError(null);
  }, [threadId, initialHasMoreMessages]);

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
    const filterColumn = threadKind === "response" ? "responseId" : "directInquiryId";
    const viewerKey =
      viewerRole === "provider"
        ? `provider:${providerId}`
        : `client:${realtimeTrackingToken || threadId}`;
    let cancelled = false;
    // supabase-js loads lazily here so it stays out of the shared bundle.
    let supabase: SupabaseClient | null = null;
    let channel: RealtimeChannel | null = null;

    (async () => {
      supabase = await getSupabaseBrowser();
      if (!supabase || cancelled) return;
      await authenticateRealtime({
        threadKind,
        threadId,
        trackingToken: realtimeTrackingToken ?? null,
      });
      if (cancelled) return;

      channel = supabase
        .channel(`messages-${threadId}`, { config: { presence: { key: viewerKey } } })
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
            const fromProvider = row.senderId != null && row.senderId === providerId;
            const own = fromProvider === (viewerRole === "provider");
            appendMessageIfNew(threadId, {
              id: row.id,
              content: row.content,
              createdAt:
                typeof row.createdAt === "string"
                  ? row.createdAt
                  : new Date(row.createdAt).toISOString(),
              senderId: row.senderId,
              senderName: row.senderName,
              sender: row.senderName
                ? { name: row.senderName, image: own ? null : otherParticipantImage ?? null }
                : null,
              status: "sent",
            });
          },
        )
        .on("broadcast", { event: "typing" }, ({ payload }) => {
          if (payload?.viewerKey === viewerKey) return;
          if (payload?.state === "start") {
            setIsOtherTyping(true);
            if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
            remoteTypingTimeoutRef.current = setTimeout(() => setIsOtherTyping(false), 2500);
          } else {
            setIsOtherTyping(false);
          }
        })
        .on("broadcast", { event: "message" }, ({ payload }) => {
          if (payload?.viewerKey === viewerKey) return;
          const message = payload?.message as ThreadMessage | undefined;
          if (!message?.id || !message.content || !message.createdAt) return;
          appendMessageIfNew(threadId, {
            ...message,
            status: "sent",
          });
        })
        .on("broadcast", { event: "read" }, ({ payload }) => {
          if (payload?.viewerKey === viewerKey) return;
          const readAt = typeof payload?.readAt === "string" ? payload.readAt : null;
          if (!readAt) return;
          setCurrentOtherReadAt((previous) =>
            !previous || Date.parse(readAt) > Date.parse(previous) ? readAt : previous,
          );
        })
        .on("presence", { event: "sync" }, () => {
          if (!channel) return;
          const state = channel.presenceState();
          const hasOtherParticipant = Object.keys(state).some((key) => key !== viewerKey);
          setIsOtherOnline(hasOtherParticipant);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            setRealtimeState("connected");
            void channel?.track({
              viewerKey,
              viewerRole,
              onlineAt: new Date().toISOString(),
            });
          } else if (
            status === "CHANNEL_ERROR" ||
            status === "TIMED_OUT" ||
            status === "CLOSED"
          ) {
            // Supabase exhausted its own retries — show the user we're
            // degraded and queue a manual reconnect via bumping the effect
            // dep. The cooldown keeps us from hot-looping when the broker
            // is down for an extended outage.
            setRealtimeState("degraded");
            setIsOtherOnline(false);
            if (reconnectTimeoutRef.current) return;
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              setReconnectNonce((n) => n + 1);
            }, 8000);
          }
        });
      realtimeChannelRef.current = channel;
    })();

    return () => {
      cancelled = true;
      realtimeChannelRef.current = null;
      setIsOtherTyping(false);
      setIsOtherOnline(false);
      if (remoteTypingTimeoutRef.current) clearTimeout(remoteTypingTimeoutRef.current);
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [threadId, threadKind, providerId, viewerRole, realtimeTrackingToken, otherParticipantImage, appendMessageIfNew, reconnectNonce]);

  // Cooldown timer for the auto-reconnect — kept outside the subscribe effect
  // so a reconnect-triggered rerun doesn't immediately clear its own timer.
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
  }, []);

  // Tab-focus retry. When the user comes back to the tab after a network hiccup,
  // we attempt one immediate reconnect instead of waiting out the 8s cooldown.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onFocus = () => {
      if (realtimeState === "degraded") {
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        setReconnectNonce((n) => n + 1);
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [realtimeState]);

  const sendTypingState = useCallback((state: "start" | "stop") => {
    const channel = realtimeChannelRef.current;
    if (!channel) return;
    const now = Date.now();
    if (state === "start" && now - lastTypingSentAtRef.current < 1200) return;
    lastTypingSentAtRef.current = now;
    void channel.send({
      type: "broadcast",
      event: "typing",
      payload: {
        state,
        viewerKey:
          viewerRole === "provider"
            ? `provider:${providerId}`
            : `client:${realtimeTrackingToken || threadId}`,
      },
    });
  }, [providerId, realtimeTrackingToken, threadId, viewerRole]);

  useEffect(() => {
    return () => {
      if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
      sendTypingState("stop");
    };
  }, [sendTypingState]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (isLoadingOlder) return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [isLoadingOlder, messages.length]);

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage || lastMessage.status !== "sent") return;
    if (isOwnMessage(lastMessage, viewerRole, providerId)) return;
    if (lastMarkedReadMessageIdRef.current === lastMessage.id) return;

    lastMarkedReadMessageIdRef.current = lastMessage.id;
    void fetch("/api/realtime/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        threadKind,
        threadId,
        trackingToken: realtimeTrackingToken ?? null,
      }),
    })
      .then(async (response) => {
        if (!response.ok) return;
        const result = (await response.json().catch(() => null)) as {
          data?: { readAt?: string };
        } | null;
        const readAt = result?.data?.readAt;
        if (!readAt) return;
        void realtimeChannelRef.current?.send({
          type: "broadcast",
          event: "read",
          payload: {
            viewerKey:
              viewerRole === "provider"
                ? `provider:${providerId}`
                : `client:${realtimeTrackingToken || threadId}`,
            readAt,
          },
        });
      })
      .catch(() => {
      // Best-effort read receipts: failed writes should not interrupt chat.
    });
  }, [messages, providerId, realtimeTrackingToken, threadId, threadKind, viewerRole]);

  const handleSend = useCallback(async () => {
    const content = inputValue.trim();
    if (!content || disabled) return;

    setInputValue("");
    const tempId = optimisticSend(threadId, content, currentSenderName);

    try {
      const serverMsg = await sendMessage(threadId, content);
      confirmSend(threadId, tempId, serverMsg);
      void realtimeChannelRef.current?.send({
        type: "broadcast",
        event: "message",
        payload: {
          viewerKey:
            viewerRole === "provider"
              ? `provider:${providerId}`
              : `client:${realtimeTrackingToken || threadId}`,
          message: serverMsg,
        },
      });
    } catch {
      failSend(threadId, tempId);
    }
  }, [inputValue, disabled, threadId, currentSenderName, optimisticSend, confirmSend, failSend, sendMessage, providerId, realtimeTrackingToken, viewerRole]);

  const handleResend = useCallback(async (msg: ThreadMessage) => {
    // Remove the failed message and re-send
    removeFailed(threadId, msg.id);
    const tempId = optimisticSend(threadId, msg.content, currentSenderName);

    try {
      const serverMsg = await sendMessage(threadId, msg.content);
      confirmSend(threadId, tempId, serverMsg);
      void realtimeChannelRef.current?.send({
        type: "broadcast",
        event: "message",
        payload: {
          viewerKey:
            viewerRole === "provider"
              ? `provider:${providerId}`
              : `client:${realtimeTrackingToken || threadId}`,
          message: serverMsg,
        },
      });
    } catch {
      failSend(threadId, tempId);
    }
  }, [threadId, currentSenderName, removeFailed, optimisticSend, confirmSend, failSend, sendMessage, providerId, realtimeTrackingToken, viewerRole]);

  const handleLoadOlder = useCallback(async () => {
    if (!loadOlderMessages || isLoadingOlder || !hasMoreMessages) return;
    const oldestMessage = messages.find(isHistoryCursorMessage);
    if (!oldestMessage) return;

    const stream = messageStreamRef.current;
    const previousScrollHeight = stream?.scrollHeight ?? 0;
    const previousScrollTop = stream?.scrollTop ?? 0;
    setIsLoadingOlder(true);
    setOlderLoadError(null);

    try {
      const result = await loadOlderMessages(oldestMessage.createdAt);
      prependMessages(threadId, result.messages);
      setHasMoreMessages(result.hasMoreMessages);
      requestAnimationFrame(() => {
        if (!stream) return;
        stream.scrollTop = stream.scrollHeight - previousScrollHeight + previousScrollTop;
      });
    } catch {
      setOlderLoadError("Nepavyko įkelti ankstesnių žinučių");
    } finally {
      setIsLoadingOlder(false);
    }
  }, [hasMoreMessages, isLoadingOlder, loadOlderMessages, messages, prependMessages, threadId]);

  const otherFallbackName = viewerRole === "provider" ? "Klientas" : "Tiekėjas";
  const otherDisplayName = otherParticipantName?.trim() || otherFallbackName;
  const otherReadTime = currentOtherReadAt ? Date.parse(currentOtherReadAt) : 0;
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

  const latestOwnMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.status !== "failed" && isOwnMessage(msg, viewerRole, providerId)) {
        return msg.id;
      }
    }
    return null;
  }, [messages, viewerRole, providerId]);

  return (
    <div className={fillHeight ? "flex min-h-0 flex-1 flex-col" : undefined}>
      {realtimeState === "degraded" && (
        <div className="mx-2 mb-2 flex items-center gap-2 rounded-md border border-amber-300/70 bg-amber-50 px-3 py-2 text-caption text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">
            Atsijungta nuo realaus laiko žinučių. Bandoma jungtis iš naujo… Jei
            laukimas užtruko, atnaujink puslapį.
          </span>
        </div>
      )}
      <div
        ref={messageStreamRef}
        className={cn(
          "flex flex-col gap-4",
          fillHeight && "chat-message-stream min-h-0 flex-1 overflow-y-auto pb-3",
          !fillHeight && groups.length > 0 && showTopBorder && "mt-4 border-t border-surface-200/60 pt-4 dark:border-surface-700",
        )}
      >
        {groups.length > 0 && showTopBorder && fillHeight && (
          <div className="border-t border-surface-200/60 dark:border-surface-700" />
        )}

        {(hasMoreMessages || olderLoadError) && loadOlderMessages && (
          <div className="flex flex-col items-center gap-2 py-1">
            {hasMoreMessages && (
              <button
                type="button"
                onClick={handleLoadOlder}
                disabled={isLoadingOlder}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[#D9C9B8] bg-[#FFFDF8] px-4 text-caption font-semibold text-[#6F5646] shadow-[0_4px_14px_rgba(93,70,54,0.08)] transition hover:border-[#A7826D]/60 hover:text-[#3B2D24] disabled:cursor-wait disabled:opacity-60"
              >
                <ChevronUp className={cn("h-3.5 w-3.5", isLoadingOlder && "animate-pulse")} />
                {isLoadingOlder ? "Įkeliama..." : "Įkelti ankstesnes"}
              </button>
            )}
            {olderLoadError && (
              <p className="text-micro font-medium text-red-600">{olderLoadError}</p>
            )}
          </div>
        )}

        {groups.map((group, groupIndex) => {
          const previousGroup = groupIndex > 0 ? groups[groupIndex - 1] : undefined;
          return (
            <div key={group.messages[0].id} className="space-y-2">
              {(groupIndex > 0 || showInitialTimeDivider) &&
                shouldShowTimeDivider(previousGroup, group) && (
                <div className="w-full">
                  <time dateTime={group.messages[0].createdAt} className="timeline-separator">
                    {formatDividerDate(group.messages[0].createdAt)}
                  </time>
                </div>
              )}

              <div className={cn("flex w-full gap-2.5", group.isOwn ? "justify-end" : "justify-start")}>
                {!group.isOwn && (
                  <ParticipantAvatar
                    name={group.senderName || otherDisplayName}
                    image={group.senderImage || otherParticipantImage}
                    className="mt-auto"
                  />
                )}

                <div
                  className={cn(
                    "flex max-w-[min(82%,34rem)] flex-col gap-2 sm:max-w-[min(70%,34rem)]",
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
                              "max-w-full rounded-2xl border px-3.5 py-2.5 text-body-sm whitespace-pre-wrap break-words dark:border-red-800 dark:bg-red-500/10 dark:text-red-300",
                              tail,
                            )}
                            style={FAILED_BUBBLE_STYLE}
                            title={formatChatTimestamp(msg.createdAt)}
                          >
                            <span style={{ color: FAILED_BUBBLE_STYLE.color }}>{decodeHtmlEntities(msg.content)}</span>
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

                    const showDeliveryReceipt = group.isOwn && msg.id === latestOwnMessageId;
                    const isSeen =
                      showDeliveryReceipt &&
                      msg.status === "sent" &&
                      otherReadTime > 0 &&
                      Date.parse(msg.createdAt) <= otherReadTime;
                    const deliveryLabel =
                      msg.status === "sending" ? "Siunčiama..." : isSeen ? "Matyta" : "Išsiųsta";

                    return (
                      <Fragment key={msg.id}>
                        <div className={cn("flex max-w-full flex-col gap-1", group.isOwn ? "items-end" : "items-start")}>
                          <div
                            className={cn(
                            "block max-w-full whitespace-pre-wrap break-words border px-4 py-2.5 text-[15px] leading-relaxed antialiased sm:px-5 sm:py-3",
                            group.isOwn
                                  ? "rounded-2xl rounded-tr-md shadow-[0_1px_2px_rgba(93,70,54,0.16)]"
                                  : "rounded-2xl rounded-tl-md shadow-[0_1px_2px_rgba(93,70,54,0.08)]",
                              tail,
                              msg.status === "sending" && "ring-1 ring-inset ring-white/30",
                            )}
                            style={group.isOwn ? OWN_BUBBLE_STYLE : OTHER_BUBBLE_STYLE}
                            title={formatChatTimestamp(msg.createdAt)}
                          >
                            <span
                              className="block min-w-0"
                              style={{ color: group.isOwn ? OWN_BUBBLE_STYLE.color : OTHER_BUBBLE_STYLE.color }}
                            >
                              {decodeHtmlEntities(msg.content)}
                            </span>
                          </div>
                          <time
                            dateTime={msg.createdAt}
                            className={cn(
                              "flex items-center gap-1.5 px-1 text-[11px] font-medium leading-none text-[#7B746D] dark:text-surface-500",
                              group.isOwn ? "text-right" : "text-left",
                            )}
                          >
                            {formatMessageTime(msg.createdAt)}
                            {showDeliveryReceipt && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{deliveryLabel}</span>
                              </>
                            )}
                          </time>
                        </div>
                        {msg.metaLabel && (
                          <span className="px-1 text-micro text-surface-400 dark:text-surface-500">
                            {msg.metaLabel}
                          </span>
                        )}
                      </Fragment>
                    );
                  })}

                </div>
              </div>
            </div>
          );
        })}
        {isOtherTyping && (
          <div className="flex items-center gap-2 px-1 text-caption font-medium text-[#6B6760]">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            {otherDisplayName} rašo...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      {!disabled && (
        <div
          className="mt-5 shrink-0 rounded-2xl border border-[#E1D4C4] bg-[#EFE4D5] p-3 shadow-[0_16px_34px_rgba(93,70,54,0.12)] dark:border-surface-700 dark:bg-surface-900"
        >
          {quickReplies.length > 0 && (
            <div className="mb-3 flex w-full max-w-full gap-2 overflow-x-auto pb-1 sm:pl-[5.5rem] sm:pr-14">
              {quickReplies.map((reply) => (
                <button
                  key={reply}
                  type="button"
                  onClick={() => setInputValue(reply)}
                    className="min-h-9 shrink-0 rounded-xl border border-[#D7C7B6] bg-[#F8F2EA] px-4 py-2 text-sm font-medium text-[#3B2D24] transition-all hover:border-[#A7826D]/60 hover:bg-white dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200"
                >
                  {decodeHtmlEntities(reply)}
                </button>
              ))}
            </div>
          )}
          <div className="relative">
            <div className="absolute left-2 top-1/2 z-10 flex -translate-y-1/2 gap-1 text-[#8A796B]">
              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl transition hover:bg-[#F1E7DA] hover:text-[#3B2D24]" aria-label="Prisegti failą">
                <Paperclip className="h-4 w-4" />
              </button>
              <button type="button" className="grid h-9 w-9 place-items-center rounded-xl transition hover:bg-[#F1E7DA] hover:text-[#3B2D24]" aria-label="Emoji">
                <Smile className="h-4 w-4" />
              </button>
            </div>
            <textarea
              rows={1}
              placeholder={placeholder}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (e.target.value.trim()) {
                  sendTypingState("start");
                  if (typingStopTimeoutRef.current) clearTimeout(typingStopTimeoutRef.current);
                  typingStopTimeoutRef.current = setTimeout(() => sendTypingState("stop"), 1600);
                } else {
                  sendTypingState("stop");
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              className="min-h-[52px] w-full resize-none rounded-2xl border border-[#D7C7B6] bg-[#FFFDF8] py-3 pl-[5.5rem] pr-14 text-body-sm text-[#25221e] shadow-[inset_0_1px_2px_rgba(93,70,54,0.05)] ring-1 ring-transparent transition-all placeholder:text-[#8A796B] focus:border-[#A7826D]/70 focus:bg-white focus:outline-none focus:ring-[#A7826D]/15 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:focus:bg-surface-900"
            />
            {isOtherOnline && (
              <span className="mt-2 inline-flex items-center gap-1.5 pl-1 text-micro font-medium text-emerald-600">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Prisijungęs dabar
              </span>
            )}
            <button
              type="button"
              onClick={handleSend}
              disabled={!inputValue.trim()}
              aria-label="Siųsti žinutę"
              className="absolute right-1.5 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-xl bg-[#E6D9C7] text-[#7B5D49] transition hover:bg-[#A7826D] hover:text-white disabled:cursor-not-allowed disabled:bg-[#EFE8DD] disabled:text-[#A79A8F] dark:disabled:bg-surface-700"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
