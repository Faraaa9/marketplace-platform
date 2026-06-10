"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArrowLeft,
  CheckCheck,
  Copy,
  MessageCircle,
  MoreHorizontal,
  Search,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import EmptyState from "@/components/ui/EmptyState";
import ThreadChat from "@/components/messaging/ThreadChat";
import { RequestBriefDrawer, type RequestBrief } from "@/components/messaging/RequestBriefDrawer";
import type { ThreadMessage } from "@/store/useConversationStore";
import { decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";
import { authenticateRealtime, getSupabaseBrowser } from "@/lib/supabase-browser";

type Conversation = {
  type: "request" | "direct";
  id: string;
  href: string;
  title: string;
  subtitle: string;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
  fromProvider: boolean;
  status: string;
  archived: boolean;
  avatarImage?: string | null;
  presenceLevel?: "online" | "recent" | null;
  presenceLabel?: string | null;
};

type ThreadData = {
  type: "direct" | "response";
  id: string;
  providerId: string;
  viewerRole: "provider" | "client";
  realtimeTrackingToken?: string | null;
  title: string;
  subtitle?: string | null;
  status?: string;
  otherParticipantName?: string | null;
  otherParticipantImage?: string | null;
  otherParticipantPresenceLevel?: "online" | "recent" | null;
  otherParticipantPresenceLabel?: string | null;
  otherParticipantReadAt?: string | null;
  requestBrief?: RequestBrief | null;
  hasMoreMessages?: boolean;
  initialMessages: ThreadMessage[];
};

type ApiThreadMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string | null;
  senderName?: string | null;
  sender?: ThreadMessage["sender"];
};

type DirectThreadResponse = {
  id: string;
  providerId: string;
  senderName?: string | null;
  senderAccountName?: string | null;
  senderEmail: string;
  senderImage?: string | null;
  senderPresenceLevel?: "online" | "recent" | null;
  senderPresenceLabel?: string | null;
  status?: string;
  description: string;
  budget?: string | null;
  createdAt?: string | null;
  clientLastReadAt?: string | null;
  hasMoreMessages?: boolean;
  messages: ApiThreadMessage[];
};

type SenderDirectThreadResponse = {
  id: string;
  providerId: string;
  providerName?: string | null;
  providerImage?: string | null;
  presenceLevel?: string | null;
  presenceLabel?: string | null;
  description: string;
  budget?: string | null;
  senderName?: string | null;
  createdAt?: string | null;
  providerLastReadAt?: string | null;
  hasMoreMessages?: boolean;
  messages: ApiThreadMessage[];
};

type OlderMessagesResponse = {
  messages: ApiThreadMessage[];
  hasMoreMessages?: boolean;
};

type RealtimeThreadPayload = {
  id?: string;
  lastMessageAt?: string | Date | null;
  providerLastReadAt?: string | Date | null;
  clientLastReadAt?: string | Date | null;
};

type ConversationListPayload = {
  conversations: Conversation[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

const INBOX_CACHE_KEY = "provider-inbox:v1";
const INBOX_PAGE_SIZE = 30;
const THREAD_REFRESH_COOLDOWN_MS = 2500;
const THREAD_REFRESH_DELAY_MS = 250;

function toThreadId(conversation: Conversation) {
  return conversation.href.split("/").pop() || conversation.id;
}

function isSenderDirectConversation(conversation: Conversation) {
  return conversation.type === "direct" && conversation.href.startsWith("/zinutes/");
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

function ConversationAvatar({
  name,
  image,
  presenceLevel,
  presenceLabel,
  size = "md",
}: {
  name: string;
  image?: string | null;
  presenceLevel?: "online" | "recent" | null;
  presenceLabel?: string | null;
  size?: "sm" | "md";
}) {
  const dimensions = size === "sm" ? "h-9 w-9" : "h-11 w-11";
  const imageSize = size === "sm" ? 36 : 44;
  const badgeSize = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <div className="relative shrink-0" title={presenceLabel || undefined}>
      <div className={`grid place-items-center overflow-hidden rounded-full bg-[#73804B] text-caption font-semibold text-white ring-1 ring-[#D8C79A] ${dimensions}`}>
        {image ? (
          <Image
            src={image}
            alt={name}
            width={imageSize}
            height={imageSize}
            sizes={`${imageSize}px`}
            className="h-full w-full object-cover"
          />
        ) : (
          initials(name)
        )}
      </div>
      {presenceLevel && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${
            presenceLevel === "online" ? "bg-[#73804B]" : "bg-[#B48645]"
          } ${badgeSize}`}
          aria-label={presenceLabel || (presenceLevel === "online" ? "Prisijungęs" : "Neseniai aktyvus")}
        />
      )}
    </div>
  );
}

function normalizeDirectThread(data: DirectThreadResponse): ThreadData {
  const senderDisplay = data.senderName?.trim() || data.senderAccountName?.trim() || data.senderEmail;
  return {
    type: "direct",
    id: data.id,
    providerId: data.providerId,
    viewerRole: "provider",
    title: senderDisplay,
    subtitle: data.senderName?.trim() || data.senderAccountName?.trim() ? null : data.senderEmail,
    status: data.status,
    otherParticipantName: senderDisplay,
    otherParticipantImage: data.senderImage ?? null,
    otherParticipantPresenceLevel: data.senderPresenceLevel ?? null,
    otherParticipantPresenceLabel: data.senderPresenceLabel ?? null,
    otherParticipantReadAt: data.clientLastReadAt ?? null,
    hasMoreMessages: data.hasMoreMessages ?? false,
    requestBrief: {
      title: "Tiesioginė užklausa",
      description: data.description,
      categoryLabel: "Tiesioginė žinutė",
      budget: data.budget,
      createdAt: data.createdAt,
    },
    initialMessages: data.messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      senderId: m.senderId,
      senderName: m.senderName ?? m.sender?.name ?? null,
      sender: m.sender,
      status: "sent" as const,
    })),
  };
}

function normalizeSenderDirectThread(data: SenderDirectThreadResponse, trackingToken: string): ThreadData {
  const providerDisplay = data.providerName?.trim() || "Tiekėjas";
  return {
    type: "direct",
    id: data.id,
    providerId: data.providerId,
    viewerRole: "client",
    realtimeTrackingToken: trackingToken,
    title: providerDisplay,
    subtitle: "Mano išsiųsta žinutė",
    otherParticipantName: providerDisplay,
    otherParticipantImage: data.providerImage ?? null,
    otherParticipantPresenceLevel: data.presenceLevel === "online" || data.presenceLevel === "recent" ? data.presenceLevel : null,
    otherParticipantPresenceLabel: data.presenceLabel ?? null,
    otherParticipantReadAt: data.providerLastReadAt ?? null,
    hasMoreMessages: data.hasMoreMessages ?? false,
    requestBrief: {
      title: "Tiesioginė užklausa",
      description: data.description,
      categoryLabel: "Tiesioginė žinutė",
      budget: data.budget,
      createdAt: data.createdAt,
    },
    initialMessages: data.messages.map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      senderId: m.senderId,
      senderName: m.senderName ?? m.sender?.name ?? null,
      sender: m.sender,
      status: "sent" as const,
    })),
  };
}

const REQUEST_STATUS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Atidaryta", color: "bg-brand-500" },
  IN_PROGRESS: { label: "Vykdoma", color: "bg-amber-500" },
  CLOSED: { label: "Uždaryta", color: "bg-surface-400" },
};

function conversationStatusLabel(thread: ThreadData, conversation: Conversation | null) {
  if (conversation?.type === "direct" || thread.type === "direct") return "Tiesioginė užklausa";
  return REQUEST_STATUS[thread.status ?? ""]?.label ?? "Užklausa";
}

function orderSummaryTitle(thread: ThreadData) {
  return thread.requestBrief?.title || thread.title;
}

export default function ProviderInboxClient() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingThread, setLoadingThread] = useState(false);
  const [listError, setListError] = useState("");
  const [threadError, setThreadError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const listFetchRef = useRef<Promise<Conversation[]> | null>(null);
  const conversationsRef = useRef<Conversation[]>([]);
  const threadFetchesRef = useRef(new Map<string, Promise<Conversation | null>>());
  const threadRefreshTimersRef = useRef(new Map<string, number>());
  const lastThreadRefreshAtRef = useRef(new Map<string, number>());
  const lastRealtimeActivityRef = useRef(new Map<string, number>());

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  const sortConversations = useCallback((items: Conversation[]) => {
    return [...items].sort(
      (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
    );
  }, []);

  const persistConversationCache = useCallback((payload: ConversationListPayload) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(INBOX_CACHE_KEY, JSON.stringify(payload));
  }, []);

  const mergeConversations = useCallback((current: Conversation[], incoming: Conversation[]) => {
    const byThread = new Map<string, Conversation>();
    for (const item of current) byThread.set(toThreadId(item), item);
    for (const item of incoming) byThread.set(toThreadId(item), item);
    return sortConversations(Array.from(byThread.values()));
  }, [sortConversations]);

  const loadConversations = useCallback(async ({ cursor, append = false }: { cursor?: string | null; append?: boolean } = {}) => {
    if (!cursor && !append && listFetchRef.current) return listFetchRef.current;
    const params = new URLSearchParams({ limit: String(INBOX_PAGE_SIZE) });
    if (cursor) params.set("cursor", cursor);
    const promise = (async () => {
      const res = await fetch(`/api/tiekejas/zinutes?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Klaida");
      const loadedConversations = sortConversations(data.data.conversations as Conversation[]);
      const next = data.data.nextCursor ?? null;
      const more = Boolean(data.data.hasMore);
      setNextCursor(next);
      setHasMoreConversations(more);
      let mergedForReturn = loadedConversations;
      setConversations((current) => {
        const updated = append ? mergeConversations(current, loadedConversations) : loadedConversations;
        mergedForReturn = updated;
        persistConversationCache({ conversations: updated, nextCursor: next, hasMore: more });
        return updated;
      });
      return mergedForReturn;
    })().finally(() => {
      if (!cursor && !append) listFetchRef.current = null;
    });
    if (!cursor && !append) listFetchRef.current = promise;
    return promise;
  }, [mergeConversations, persistConversationCache, sortConversations]);

  const upsertConversation = useCallback((conversation: Conversation) => {
    setConversations((items) => {
      const threadId = toThreadId(conversation);
      const next = items.some((item) => toThreadId(item) === threadId)
        ? items.map((item) => (toThreadId(item) === threadId ? conversation : item))
        : [conversation, ...items];
      const sorted = sortConversations(next);
      persistConversationCache({ conversations: sorted, nextCursor, hasMore: hasMoreConversations });
      return sorted;
    });
  }, [hasMoreConversations, nextCursor, persistConversationCache, sortConversations]);

  const removeConversation = useCallback((threadId: string) => {
    setConversations((items) => {
      const next = items.filter((item) => toThreadId(item) !== threadId);
      persistConversationCache({ conversations: next, nextCursor, hasMore: hasMoreConversations });
      return next;
    });
  }, [hasMoreConversations, nextCursor, persistConversationCache]);

  const loadConversation = useCallback(async (threadId: string) => {
    const existing = threadFetchesRef.current.get(threadId);
    if (existing) return existing;

    const promise = (async () => {
      const res = await fetch(`/api/tiekejas/zinutes?thread=${encodeURIComponent(threadId)}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Klaida");
      const [conversation] = data.data.conversations as Conversation[];
      if (conversation) {
        upsertConversation(conversation);
        return conversation;
      } else {
        removeConversation(threadId);
        return null;
      }
    })().finally(() => {
      threadFetchesRef.current.delete(threadId);
      lastThreadRefreshAtRef.current.set(threadId, Date.now());
    });

    threadFetchesRef.current.set(threadId, promise);
    return promise;
  }, [removeConversation, upsertConversation]);

  const loadMoreConversations = useCallback(async () => {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      await loadConversations({ cursor: nextCursor, append: true });
    } finally {
      setLoadingMore(false);
    }
  }, [loadConversations, loadingMore, nextCursor]);

  const selectConversation = useCallback(async (conversation: Conversation) => {
    const id = toThreadId(conversation);
    setSelectedId(id);
    setLoadingThread(true);
    setThreadError("");
    window.history.replaceState(null, "", `/tiekejas/zinutes?thread=${encodeURIComponent(id)}`);
    try {
      const isSenderDirect = isSenderDirectConversation(conversation);
      const res = await fetch(isSenderDirect ? `/api/zinutes/${id}` : `/api/tiekejas/zinutes/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Klaida");
      setThread(
        data.data.type === "response"
          ? { ...data.data, viewerRole: "provider" as const }
          : isSenderDirect
            ? normalizeSenderDirectThread(data.data, id)
            : normalizeDirectThread(data.data),
      );
    } catch {
      setThread(null);
      setThreadError("Nepavyko įkelti pokalbio.");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    setListError("");
    if (typeof window !== "undefined") {
      const cached = window.sessionStorage.getItem(INBOX_CACHE_KEY);
      if (cached) {
        try {
          const parsed = JSON.parse(cached) as ConversationListPayload;
          if (Array.isArray(parsed.conversations) && parsed.conversations.length > 0) {
            setConversations(sortConversations(parsed.conversations));
            setNextCursor(parsed.nextCursor ?? null);
            setHasMoreConversations(Boolean(parsed.hasMore));
            setLoadingList(false);
          }
        } catch {
          window.sessionStorage.removeItem(INBOX_CACHE_KEY);
        }
      }
    }
    loadConversations()
      .then((loadedConversations) => {
        if (cancelled) return;
        const initialThread = new URLSearchParams(window.location.search).get("thread");
        const initialConversation = loadedConversations.find((c) => toThreadId(c) === initialThread);
        if (initialConversation) {
          void selectConversation(initialConversation);
        } else if (initialThread) {
          void loadConversation(initialThread).then((conversation) => {
            if (conversation && !cancelled) void selectConversation(conversation);
          });
        }
      })
      .catch(() => {
        if (!cancelled) setListError("Nepavyko įkelti žinučių.");
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });

    const interval = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadConversations().catch(() => {
        // Keep the current list visible; the next poll can recover.
      });
    }, 60000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [loadConversation, loadConversations, selectConversation, sortConversations]);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase || !session?.user?.id) return;

    let cancelled = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const refreshConversation = (threadId: string) => {
      const existing = conversationsRef.current.find((item) => toThreadId(item) === threadId);
      if (existing) {
        const existingActivity = new Date(existing.lastMessageAt).getTime();
        const rowActivity = lastRealtimeActivityRef.current.get(threadId);
        if (rowActivity && rowActivity <= existingActivity) return;
      }

      const now = Date.now();
      const lastRefreshAt = lastThreadRefreshAtRef.current.get(threadId) ?? 0;
      if (
        threadFetchesRef.current.has(threadId) ||
        threadRefreshTimersRef.current.has(threadId) ||
        now - lastRefreshAt < THREAD_REFRESH_COOLDOWN_MS
      ) {
        return;
      }

      const timer = window.setTimeout(() => {
        threadRefreshTimersRef.current.delete(threadId);
        void loadConversation(threadId).catch(() => {
          // Polling remains as a fallback if a realtime row refresh fails.
        });
      }, THREAD_REFRESH_DELAY_MS);
      threadRefreshTimersRef.current.set(threadId, timer);
    };

    (async () => {
      const authenticated = await authenticateRealtime();
      if (cancelled || !authenticated) return;

      channel = supabase
        .channel(`provider-inbox-${session.user.id}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "responses",
            filter: `providerId=eq.${session.user.id}`,
          },
          (payload) => {
            const row = payload.new as RealtimeThreadPayload;
            if (!row.id) return;
            if (row.lastMessageAt) {
              lastRealtimeActivityRef.current.set(`response-${row.id}`, new Date(row.lastMessageAt).getTime());
            }
            refreshConversation(`response-${row.id}`);
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "direct_inquiries",
          },
          (payload) => {
            const row = payload.new as RealtimeThreadPayload;
            if (!row.id) return;
            if (row.lastMessageAt) {
              lastRealtimeActivityRef.current.set(row.id, new Date(row.lastMessageAt).getTime());
            }
            refreshConversation(row.id);
          },
        )
        .subscribe();
    })();

    return () => {
      cancelled = true;
      for (const timer of threadRefreshTimersRef.current.values()) {
        window.clearTimeout(timer);
      }
      threadRefreshTimersRef.current.clear();
      if (channel) supabase.removeChannel(channel);
    };
  }, [loadConversation, session?.user?.id]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => toThreadId(c) === selectedId) ?? null,
    [conversations, selectedId],
  );

  const filteredConversations = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase("lt-LT");
    if (!query) return conversations;
    return conversations.filter((c) =>
      [c.title, c.subtitle, c.preview, c.status]
        .filter(Boolean)
        .some((value) => decodeHtmlEntities(value ?? "").toLocaleLowerCase("lt-LT").includes(query)),
    );
  }, [conversations, searchQuery]);

  const copyConversationLink = useCallback(async () => {
    if (!selectedConversation || typeof window === "undefined") return;
    const threadId = toThreadId(selectedConversation);
    await navigator.clipboard.writeText(
      `${window.location.origin}/tiekejas/zinutes?thread=${encodeURIComponent(threadId)}`,
    );
    setMoreOpen(false);
  }, [selectedConversation]);

  const markSelectedConversationRead = useCallback(() => {
    if (!selectedConversation) return;
    setConversations((items) =>
      items.map((item) =>
        item.type === selectedConversation.type && item.id === selectedConversation.id
          ? { ...item, unread: false }
          : item,
      ),
    );
    setSettingsOpen(false);
  }, [selectedConversation]);

  const bumpSelectedConversation = useCallback((message: ThreadMessage) => {
    if (!selectedConversation) return;
    const selectedThreadId = toThreadId(selectedConversation);
    lastThreadRefreshAtRef.current.set(selectedThreadId, Date.now());
    setConversations((items) =>
      sortConversations(
        items.map((item) =>
          item.type === selectedConversation.type && item.id === selectedConversation.id
            ? {
                ...item,
                preview: message.content,
                lastMessageAt: message.createdAt,
                fromProvider: true,
                unread: false,
              }
            : item,
        ),
      ),
    );
  }, [selectedConversation, sortConversations]);

  const sendMessage = useCallback(async (threadId: string, content: string): Promise<ThreadMessage> => {
    if (!thread) throw new Error("Nėra pokalbio");
    const url =
      thread.type === "response"
        ? `/api/requests/${threadId}/messages`
        : thread.viewerRole === "client" && thread.realtimeTrackingToken
          ? `/api/zinutes/${thread.realtimeTrackingToken}/messages`
          : `/api/tiekejas/zinutes/${threadId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Klaida");
    const sentMessage: ThreadMessage = {
      id: data.data.id,
      content: data.data.content,
      createdAt: data.data.createdAt,
      senderId: data.data.sender?.id ?? data.data.senderId ?? null,
      senderName: data.data.senderName,
      sender: data.data.sender,
      status: "sent",
    };
    bumpSelectedConversation(sentMessage);
    return sentMessage;
  }, [bumpSelectedConversation, thread]);

  const loadOlderMessages = useCallback(
    async (beforeCreatedAt: string): Promise<{ messages: ThreadMessage[]; hasMoreMessages: boolean }> => {
      if (!thread) return { messages: [], hasMoreMessages: false };
      const endpoint = thread.realtimeTrackingToken
        ? `/api/zinutes/${thread.realtimeTrackingToken}`
        : `/api/tiekejas/zinutes/${thread.type === "response" ? `response-${thread.id}` : thread.id}`;
      const res = await fetch(`${endpoint}?before=${encodeURIComponent(beforeCreatedAt)}`, {
        credentials: "include",
      });
      const data = (await res.json()) as { success?: boolean; error?: string; data?: OlderMessagesResponse };
      if (!data.success || !data.data) throw new Error(data.error || "Klaida");
      return {
        hasMoreMessages: data.data.hasMoreMessages ?? false,
        messages: data.data.messages.map((m) => ({
          id: m.id,
          content: m.content,
          createdAt: m.createdAt,
          senderId: m.senderId,
          senderName: m.senderName ?? m.sender?.name ?? null,
          sender: m.sender,
          status: "sent" as const,
        })),
      };
    },
    [thread],
  );

  return (
    <div className="-mb-[calc(3.5rem+env(safe-area-inset-bottom))] bg-[#ECE9E2] bg-[linear-gradient(to_right,rgba(15,23,42,0.035)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.035)_1px,transparent_1px)] bg-[size:56px_56px] px-3 py-3 md:mb-0 md:px-5 md:py-5 dark:bg-surface-950 dark:bg-none">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-[#D8D1BF] bg-[#FBFAF6] shadow-[0_12px_40px_rgba(72,65,52,0.10)] dark:border-surface-800 dark:bg-surface-900/90">
        <div className="grid h-[calc(100dvh-6rem)] min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-[#D8D1BF] bg-[#F7F4ED] dark:border-surface-700/60 dark:bg-surface-950/40`}>
            <div className="flex min-h-[64px] items-center justify-between border-b border-[#D8C79A] bg-[#FBFAF6] px-5 py-2.5 dark:border-surface-700/60">
              {searchOpen ? (
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Ieškoti pokalbių</span>
                  <input
                    autoFocus
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Ieškoti pokalbių..."
                    className="h-11 w-full rounded-full border border-[#D8C79A] bg-[#F1E7CE] px-4 text-body-sm text-[#24211D] outline-none transition focus:border-[#73804B] focus:bg-white"
                  />
                </label>
              ) : (
                <div>
                  <p className="text-body font-semibold text-[#24211D] dark:text-white">Visos žinutės</p>
                  <Link href="/tiekejas" className="inline-flex items-center gap-1 text-micro text-[#6C6558] hover:text-[#24211D]">
                    <ArrowLeft className="h-3 w-3" />
                    Valdymo panelė
                  </Link>
                </div>
              )}
              <button
                type="button"
                aria-label={searchOpen ? "Uždaryti paiešką" : "Ieškoti pokalbių"}
                aria-pressed={searchOpen}
                onClick={() => {
                  setSearchOpen((open) => !open);
                  if (searchOpen) setSearchQuery("");
                }}
                className="grid min-h-11 min-w-11 place-items-center rounded-full border border-[#D8C79A] bg-[#FBFAF6] text-[#6C6558] transition hover:bg-[#F1E7CE] hover:text-[#24211D] dark:bg-surface-900 dark:ring-surface-700"
              >
                {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
              {loadingList ? (
                <div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-[#D8D1BF] bg-[#FBFAF6] p-3">
                      <div className="flex items-start gap-3.5">
                        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#EFE5CC]" />
                        <div className="min-w-0 flex-1 space-y-2 pt-1">
                          <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#EFE5CC]" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-[#EFE5CC]" />
                          <div className="h-3 w-5/6 animate-pulse rounded bg-[#EFE5CC]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <EmptyState title={listError || "Žinučių dar nėra"} icon={<MessageCircle className="h-12 w-12" />} />
              ) : filteredConversations.length === 0 ? (
                <EmptyState title="Pokalbių nerasta" description="Pabandykite kitą vardą arba žinutės tekstą." icon={<Search className="h-12 w-12" />} />
              ) : (
                <div>
                  {filteredConversations.map((c) => {
                    const id = toThreadId(c);
                    const active = id === selectedId;
                    const status = c.type === "request" ? REQUEST_STATUS[c.status] : null;
                    return (
                      <button key={`${c.type}-${c.id}`} onClick={() => selectConversation(c)} className="group block w-full text-left">
                        <article className={`relative border-b border-[#DDD4BF] p-3 transition-colors hover:bg-[#F1E7CE] dark:border-surface-700/60 dark:hover:bg-surface-800/70 ${
                          active
                            ? "rounded-xl border border-[#C7B77E] bg-[#EFE5CC] shadow-[0_6px_18px_rgba(72,65,52,0.10)] dark:bg-surface-800/70"
                            : c.unread
                              ? "bg-[#F1E7CE] dark:bg-surface-800/40"
                              : "bg-[#FBFAF6] dark:bg-surface-950/40"
                        }`}>
                          {active && <span className="hidden" aria-hidden="true" />}
                          <div className="flex items-start gap-3.5">
                            <ConversationAvatar
                              name={c.title}
                              image={c.avatarImage}
                              presenceLevel={c.presenceLevel}
                              presenceLabel={c.presenceLabel}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <h3 className="min-w-0 flex-1 truncate text-body-sm font-semibold text-[#24211D]">
                                  {decodeHtmlEntities(c.title)}
                                </h3>
                                <time className="ml-auto shrink-0 text-right text-[11px] font-medium leading-5 text-[#6C6558]" dateTime={c.lastMessageAt}>
                                  {formatRelativeDate(new Date(c.lastMessageAt))}
                                </time>
                              </div>
                              <div className="mt-0.5 flex items-center gap-2">
                                {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#A65336]" />}
                                {c.subtitle && !(c.title && c.subtitle.includes("@")) && (
                                  <p className="min-w-0 flex-1 truncate text-micro text-[#6C6558]">
                                    {decodeHtmlEntities(c.subtitle)}
                                  </p>
                                )}
                                <span className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full bg-[#F1E7CE] px-2 py-0.5 text-[10px] font-medium leading-4 text-[#6C6558]">
                                  {status && <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />}
                                  {status ? status.label : "Tiesioginė"}
                                </span>
                              </div>
                              <div className="mt-1.5 flex items-start gap-2">
                                <p className="min-w-0 flex-1 line-clamp-1 text-body-sm font-normal text-[#6C6558]">
                                  {c.fromProvider && <span>Jūs: </span>}
                                  {decodeHtmlEntities(c.preview)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </article>
                      </button>
                    );
                  })}
                  {!searchQuery.trim() && hasMoreConversations && (
                    <div className="px-3 py-3">
                      <button
                        type="button"
                        onClick={loadMoreConversations}
                        disabled={loadingMore}
                        className="min-h-11 w-full rounded-xl border border-[#D8C79A] bg-[#FBFAF6] px-4 text-body-sm font-semibold text-[#6C6558] transition hover:bg-[#F1E7CE] hover:text-[#24211D] disabled:cursor-wait disabled:opacity-60"
                      >
                        {loadingMore ? "Kraunama..." : "Įkelti senesnius pokalbius"}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>

          <main className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col bg-[#FBFAF6] dark:bg-surface-900`}>
            {threadError ? (
              <div className="grid min-h-0 flex-1 place-items-center p-8 text-center text-body-sm text-red-600">
                {threadError}
              </div>
            ) : !thread && !loadingThread ? (
              <div className="grid min-h-0 flex-1 place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#EFE5CC]/70 text-[#B48645]">
                    <MessageCircle className="h-7 w-7" />
                  </div>
                  <h1 className="mt-4 text-heading-2 font-semibold text-[#24211D]">Pasirinkite pokalbį</h1>
                  <p className="mt-2 max-w-sm text-body-sm text-[#6C6558]">Kairėje pasirinkite klientą arba užklausą.</p>
                </div>
              </div>
            ) : loadingThread || !thread ? (
              <div className="grid min-h-0 flex-1 place-items-center text-body-sm text-[#6C6558]">Kraunama...</div>
            ) : (
              <>
                <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-[#D8C79A] bg-[#FBFAF6] px-4 py-1.5 dark:border-surface-700/60 md:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                  <button className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[#6C6558] hover:bg-[#F1E7CE] hover:text-[#24211D] lg:hidden" onClick={() => setSelectedId(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                    <ConversationAvatar
                      name={thread.title}
                      image={thread.otherParticipantImage}
                      presenceLevel={thread.otherParticipantPresenceLevel}
                      presenceLabel={thread.otherParticipantPresenceLabel}
                      size="sm"
                    />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 leading-tight">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#B48645]" aria-hidden="true" />
                      <p className="truncate text-body font-semibold text-[#24211D]">{decodeHtmlEntities(thread.title)}</p>
                      <span className="rounded-full bg-[#F1E7CE] px-2 py-0.5 text-micro font-medium text-[#6C6558]">
                        {selectedConversation?.type === "direct" ? "Tiesioginė" : "Užklausa"}
                      </span>
                    </div>
                    {thread.subtitle && <p className="mt-0.5 truncate text-caption text-[#6C6558]">{decodeHtmlEntities(thread.subtitle)}</p>}
                  </div>
                  </div>
                  <div className="relative hidden items-center gap-1 sm:flex">
                    <button
                      type="button"
                      aria-label="Pokalbio nustatymai"
                      aria-expanded={settingsOpen}
                      onClick={() => {
                        setSettingsOpen((open) => !open);
                        setMoreOpen(false);
                      }}
                    className="grid min-h-9 min-w-9 place-items-center rounded-xl border border-[#D8C79A] bg-[#FBFAF6] text-[#6C6558] transition hover:bg-[#F1E7CE] hover:text-[#24211D]"
                    >
                      <Settings className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Daugiau veiksmų"
                      aria-expanded={moreOpen}
                      onClick={() => {
                        setMoreOpen((open) => !open);
                        setSettingsOpen(false);
                      }}
                      className="grid min-h-9 min-w-9 place-items-center rounded-xl border border-[#D8C79A] bg-[#FBFAF6] text-[#6C6558] transition hover:bg-[#F1E7CE] hover:text-[#24211D]"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                    {settingsOpen && (
                      <div className="absolute right-10 top-11 z-30 w-64 rounded-xl border border-[#D8C79A] bg-[#FBFAF6] p-2 text-body-sm text-[#24211D] shadow-[0_18px_45px_rgba(31,27,23,0.14)]">
                        <p className="px-3 py-2 text-micro font-semibold uppercase tracking-wide text-[#6C6558]">Nustatymai</p>
                        <button type="button" onClick={markSelectedConversationRead} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left transition hover:bg-[#F1E7CE]">
                          <CheckCheck className="h-4 w-4 text-[#6C6558]" />
                          Pažymėti kaip perskaitytą
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSettingsOpen(false);
                            setMoreOpen(true);
                          }}
                          className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left transition hover:bg-[#F1E7CE]"
                        >
                          <Archive className="h-4 w-4 text-[#6C6558]" />
                          Tvarkyti pokalbį
                        </button>
                      </div>
                    )}
                    {moreOpen && (
                      <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-[#D8C79A] bg-[#FBFAF6] p-2 text-body-sm text-[#24211D] shadow-[0_18px_45px_rgba(31,27,23,0.14)]">
                        <p className="px-3 py-2 text-micro font-semibold uppercase tracking-wide text-[#6C6558]">Veiksmai</p>
                        <button type="button" onClick={copyConversationLink} className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left transition hover:bg-[#F1E7CE]">
                          <Copy className="h-4 w-4 text-[#6C6558]" />
                          Kopijuoti nuorodą
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div
                  className="flex min-h-0 flex-1 flex-col bg-[#FBFAF6] px-4 py-4 md:px-5"
                >
                  <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-[#D8C79A] bg-[#F7F0DF] px-4 py-3 shadow-[0_8px_24px_rgba(72,65,52,0.08)] dark:border-surface-700 dark:bg-surface-900">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-[#24211D] dark:text-white">
                        Užsakymas: {decodeHtmlEntities(orderSummaryTitle(thread))}
                      </p>
                      <p className="mt-1 text-caption font-medium text-[#6C6558] dark:text-surface-400">
                        Statusas: {conversationStatusLabel(thread, selectedConversation)}
                      </p>
                    </div>
                    {thread.requestBrief && (
                      <RequestBriefDrawer
                        brief={thread.requestBrief}
                        triggerClassName="ml-auto border border-[#D8C79A] bg-[#73804B] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] hover:bg-[#6A7544] focus:ring-[#73804B]/25"
                      />
                    )}
                  </div>
                  <ThreadChat
                    threadId={thread.id}
                    threadKind={thread.type === "response" ? "response" : "directInquiry"}
                    initialMessages={thread.initialMessages}
                    currentSenderName={session?.user?.name || "Tiekėjas"}
                    viewerRole={thread.viewerRole}
                    providerId={thread.providerId}
                    otherParticipantName={thread.otherParticipantName}
                    otherParticipantImage={thread.otherParticipantImage}
                    otherParticipantReadAt={thread.otherParticipantReadAt}
                    realtimeTrackingToken={thread.realtimeTrackingToken}
                    requestBrief={thread.requestBrief}
                    hasMoreMessages={thread.hasMoreMessages}
                    loadOlderMessages={loadOlderMessages}
                    fillHeight
                    showTopBorder={false}
                    quickReplies={["Kada atvyksite?", "Kokia kaina?", "Ačiū!", "Galite paskambinti?"]}
                    sendMessage={sendMessage}
                    placeholder="Rašyti žinutę..."
                  />
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
