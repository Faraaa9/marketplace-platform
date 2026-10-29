"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ThreadChat from "@/components/messaging/ThreadChat";
import { RequestBriefDrawer, type RequestBrief } from "@/components/messaging/RequestBriefDrawer";
import { Avatar, Chip, type ChipTone } from "@/components/account/ui";
import type { ThreadMessage } from "@/store/useConversationStore";
import { cn, decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";
import {
  authenticateRealtime,
  getSupabaseBrowser,
  type RealtimeChannelLike,
  type SupabaseBrowserClient,
} from "@/lib/supabase-browser";

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
};

type ThreadData = {
  type: "direct" | "response";
  id: string;
  providerId: string;
  title: string;
  subtitle?: string | null;
  status?: string;
  otherParticipantName?: string | null;
  otherParticipantImage?: string | null;
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
  status?: string;
  description: string;
  budget?: string | null;
  createdAt?: string | null;
  clientLastReadAt?: string | null;
  hasMoreMessages?: boolean;
  messages: ApiThreadMessage[];
};

type RealtimeThreadPayload = { id?: string; lastMessageAt?: string | Date | null };

type ConversationListPayload = {
  conversations: Conversation[];
  nextCursor?: string | null;
  hasMore?: boolean;
};

// v2: the list no longer carries the provider's own sent inquiries.
const INBOX_CACHE_KEY = "provider-inbox:v2";
const INBOX_PAGE_SIZE = 30;
const THREAD_REFRESH_COOLDOWN_MS = 2500;
const THREAD_REFRESH_DELAY_MS = 250;
const QUICK_REPLIES = ["Kada galite pradėti?", "Galiu atvažiuoti apžiūrėti", "Ačiū!"];

function toThreadId(conversation: Conversation) {
  return conversation.href.split("/").pop() || conversation.id;
}

function conversationState(c: Conversation): { label: string; tone: ChipTone } {
  if (c.archived) return { label: "Archyvas", tone: "closed" };
  if (c.type === "direct") return { label: "Žinutė", tone: "closed" };
  if (c.status === "IN_PROGRESS") return { label: "Priimta", tone: "open" };
  if (c.status === "CLOSED") return { label: "Uždaryta", tone: "closed" };
  return { label: "Pasiūlymas", tone: "progress" };
}

function mapMessages(messages: ApiThreadMessage[]): ThreadMessage[] {
  return messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    senderId: m.senderId,
    senderName: m.senderName ?? m.sender?.name ?? null,
    sender: m.sender,
    status: "sent" as const,
  }));
}

function normalizeDirectThread(data: DirectThreadResponse): ThreadData {
  const senderDisplay = data.senderName?.trim() || data.senderAccountName?.trim() || data.senderEmail;
  return {
    type: "direct",
    id: data.id,
    providerId: data.providerId,
    title: senderDisplay,
    subtitle: "Žinutė iš profilio",
    status: data.status,
    otherParticipantName: senderDisplay,
    otherParticipantImage: data.senderImage ?? null,
    otherParticipantReadAt: data.clientLastReadAt ?? null,
    hasMoreMessages: data.hasMoreMessages ?? false,
    requestBrief: {
      title: "Žinutė",
      description: data.description,
      categoryLabel: "Klientas",
      budget: data.budget,
      createdAt: data.createdAt,
    },
    initialMessages: mapMessages(data.messages),
  };
}

/**
 * Provider inbox: offer threads (Response) and direct inquiries from clients
 * in one two-pane view. The provider's own requests and the inquiries they
 * sent as a customer live in the customer account (/paskyra/zinutes).
 */
export default function ProviderInboxClient() {
  const router = useRouter();
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
  const [searchQuery, setSearchQuery] = useState("");
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
    return [...items].sort((a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime());
  }, []);

  const persistConversationCache = useCallback((payload: ConversationListPayload) => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(INBOX_CACHE_KEY, JSON.stringify(payload));
  }, []);

  const mergeConversations = useCallback(
    (current: Conversation[], incoming: Conversation[]) => {
      const byThread = new Map<string, Conversation>();
      for (const item of current) byThread.set(toThreadId(item), item);
      for (const item of incoming) byThread.set(toThreadId(item), item);
      return sortConversations(Array.from(byThread.values()));
    },
    [sortConversations],
  );

  const loadConversations = useCallback(
    async ({ cursor, append = false }: { cursor?: string | null; append?: boolean } = {}) => {
      if (!cursor && !append && listFetchRef.current) return listFetchRef.current;
      const params = new URLSearchParams({ limit: String(INBOX_PAGE_SIZE) });
      if (cursor) params.set("cursor", cursor);
      const promise = (async () => {
        const res = await fetch(`/api/tiekejas/zinutes?${params.toString()}`, { cache: "no-store" });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Klaida");
        const loaded = sortConversations(data.data.conversations as Conversation[]);
        const next = data.data.nextCursor ?? null;
        const more = Boolean(data.data.hasMore);
        setNextCursor(next);
        setHasMoreConversations(more);
        let mergedForReturn = loaded;
        setConversations((current) => {
          const updated = append ? mergeConversations(current, loaded) : loaded;
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
    },
    [mergeConversations, persistConversationCache, sortConversations],
  );

  const upsertConversation = useCallback(
    (conversation: Conversation) => {
      setConversations((items) => {
        const threadId = toThreadId(conversation);
        const next = items.some((item) => toThreadId(item) === threadId)
          ? items.map((item) => (toThreadId(item) === threadId ? conversation : item))
          : [conversation, ...items];
        const sorted = sortConversations(next);
        persistConversationCache({ conversations: sorted, nextCursor, hasMore: hasMoreConversations });
        return sorted;
      });
    },
    [hasMoreConversations, nextCursor, persistConversationCache, sortConversations],
  );

  const removeConversation = useCallback(
    (threadId: string) => {
      setConversations((items) => {
        const next = items.filter((item) => toThreadId(item) !== threadId);
        persistConversationCache({ conversations: next, nextCursor, hasMore: hasMoreConversations });
        return next;
      });
    },
    [hasMoreConversations, nextCursor, persistConversationCache],
  );

  const loadConversation = useCallback(
    async (threadId: string) => {
      const existing = threadFetchesRef.current.get(threadId);
      if (existing) return existing;
      const promise = (async () => {
        const res = await fetch(`/api/tiekejas/zinutes?thread=${encodeURIComponent(threadId)}`, { cache: "no-store" });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Klaida");
        const [conversation] = data.data.conversations as Conversation[];
        if (conversation) {
          upsertConversation(conversation);
          return conversation;
        }
        removeConversation(threadId);
        return null;
      })().finally(() => {
        threadFetchesRef.current.delete(threadId);
        lastThreadRefreshAtRef.current.set(threadId, Date.now());
      });
      threadFetchesRef.current.set(threadId, promise);
      return promise;
    },
    [removeConversation, upsertConversation],
  );

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
      const res = await fetch(`/api/tiekejas/zinutes/${id}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Klaida");
      setThread(data.data.type === "response" ? data.data : normalizeDirectThread(data.data));
      setConversations((items) => items.map((item) => (toThreadId(item) === id ? { ...item, unread: false } : item)));
    } catch {
      setThread(null);
      setThreadError("Nepavyko įkelti pokalbio.");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const initialParams = new URLSearchParams(window.location.search);
    // Pre-redesign deep link: the offer composer lived in the inbox.
    const legacyRequest = initialParams.get("request");
    if (legacyRequest) {
      router.replace(`/tiekejas/uzklausa/${encodeURIComponent(legacyRequest)}`);
      return;
    }
    const cached = window.sessionStorage.getItem(INBOX_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as ConversationListPayload;
        if (Array.isArray(parsed.conversations) && parsed.conversations.length > 0) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- init-from-sessionStorage hydration; see eslint.config.mjs note
          setConversations(sortConversations(parsed.conversations));
          setNextCursor(parsed.nextCursor ?? null);
          setHasMoreConversations(Boolean(parsed.hasMore));
          setLoadingList(false);
        }
      } catch {
        window.sessionStorage.removeItem(INBOX_CACHE_KEY);
      }
    }
    loadConversations()
      .then((loaded) => {
        if (cancelled) return;
        const initialThread = initialParams.get("thread");
        const initialConversation = loaded.find((c) => toThreadId(c) === initialThread);
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
  }, [loadConversation, loadConversations, router, selectConversation, sortConversations]);

  useEffect(() => {
    if (!session?.user?.id) return;
    let cancelled = false;
    // supabase-js loads lazily here so it stays out of the shared bundle.
    let supabase: SupabaseBrowserClient | null = null;
    let channel: RealtimeChannelLike | null = null;

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

    const onRow = (prefix: string) => (payload: { new: unknown }) => {
      const row = payload.new as RealtimeThreadPayload;
      if (!row.id) return;
      const threadId = `${prefix}${row.id}`;
      if (row.lastMessageAt) lastRealtimeActivityRef.current.set(threadId, new Date(row.lastMessageAt).getTime());
      refreshConversation(threadId);
    };

    (async () => {
      supabase = await getSupabaseBrowser();
      if (!supabase || cancelled) return;
      const authenticated = await authenticateRealtime();
      if (cancelled || !authenticated) return;
      channel = supabase
        .channel(`provider-inbox-${session.user.id}`)
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "responses", filter: `providerId=eq.${session.user.id}` },
          onRow("response-"),
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "direct_inquiries", filter: `providerId=eq.${session.user.id}` },
          onRow(""),
        )
        .subscribe();
    })();

    // The ref holds one stable Map for the component's lifetime.
    const threadRefreshTimers = threadRefreshTimersRef.current;
    return () => {
      cancelled = true;
      for (const timer of threadRefreshTimers.values()) window.clearTimeout(timer);
      threadRefreshTimers.clear();
      if (channel && supabase) supabase.removeChannel(channel);
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
      [c.title, c.subtitle, c.preview]
        .filter(Boolean)
        .some((value) => decodeHtmlEntities(value ?? "").toLocaleLowerCase("lt-LT").includes(query)),
    );
  }, [conversations, searchQuery]);

  const sendMessage = useCallback(
    async (threadId: string, content: string): Promise<ThreadMessage> => {
      if (!thread) throw new Error("Nėra pokalbio");
      const url =
        thread.type === "response" ? `/api/requests/${threadId}/messages` : `/api/tiekejas/zinutes/${threadId}/messages`;
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
      if (selectedId) {
        lastThreadRefreshAtRef.current.set(selectedId, Date.now());
        setConversations((items) =>
          sortConversations(
            items.map((item) =>
              toThreadId(item) === selectedId
                ? { ...item, preview: sentMessage.content, lastMessageAt: sentMessage.createdAt, fromProvider: true, unread: false }
                : item,
            ),
          ),
        );
      }
      return sentMessage;
    },
    [selectedId, sortConversations, thread],
  );

  const loadOlderMessages = useCallback(
    async (beforeCreatedAt: string): Promise<{ messages: ThreadMessage[]; hasMoreMessages: boolean }> => {
      if (!thread) return { messages: [], hasMoreMessages: false };
      const endpoint = `/api/tiekejas/zinutes/${thread.type === "response" ? `response-${thread.id}` : thread.id}`;
      const res = await fetch(`${endpoint}?before=${encodeURIComponent(beforeCreatedAt)}`, { credentials: "include" });
      const data = (await res.json()) as {
        success?: boolean;
        error?: string;
        data?: { messages: ApiThreadMessage[]; hasMoreMessages?: boolean };
      };
      if (!data.success || !data.data) throw new Error(data.error || "Klaida");
      return { hasMoreMessages: data.data.hasMoreMessages ?? false, messages: mapMessages(data.data.messages) };
    },
    [thread],
  );

  const closeThread = () => {
    setSelectedId(null);
    setThread(null);
    window.history.replaceState(null, "", "/tiekejas/zinutes");
  };

  return (
    <div className="flex h-[calc(100dvh-72px-3.5rem-12rem)] min-h-[520px] overflow-hidden rounded-xl border border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900 md:h-[calc(100dvh-72px-11rem)]">
      <div
        className={cn(
          "min-h-0 w-full flex-col border-r border-surface-100 dark:border-surface-800 md:flex md:w-[300px] md:shrink-0 lg:w-[330px]",
          selectedId ? "hidden" : "flex",
        )}
      >
        <div className="p-2.5 pb-1">
          <label className="block">
            <span className="sr-only">Ieškoti pokalbių</span>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ieškoti pokalbių…"
              className="h-11 w-full rounded-lg border border-surface-200 bg-white px-3 text-body-sm outline-none focus:border-brand-600 dark:border-surface-700 dark:bg-surface-900"
            />
          </label>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-2.5 pt-1">
          {loadingList ? (
            <p className="p-3 text-surface-500">Kraunama…</p>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-surface-500">
              <MessageCircle className="mx-auto mb-2 h-8 w-8 text-surface-300" />
              {listError || "Pokalbių dar nėra. Išsiuntus pasiūlymą, pokalbis su klientu atsiras čia."}
            </div>
          ) : filteredConversations.length === 0 ? (
            <p className="p-3 text-center text-surface-500">Pokalbių nerasta.</p>
          ) : (
            <>
              {filteredConversations.map((c) => {
                const id = toThreadId(c);
                const state = conversationState(c);
                return (
                  <button
                    key={`${c.type}-${c.id}`}
                    type="button"
                    onClick={() => selectConversation(c)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-[10px] p-3 text-left transition-colors",
                      id === selectedId ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-surface-50 dark:hover:bg-surface-800",
                    )}
                  >
                    <Avatar name={decodeHtmlEntities(c.type === "request" ? c.subtitle || c.title : c.title)} image={c.avatarImage} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <strong className={cn("truncate", !c.unread && "font-semibold")}>
                          {decodeHtmlEntities(c.type === "request" ? c.subtitle || "Klientas" : c.title)}
                        </strong>
                        <span className="shrink-0 text-micro font-normal text-surface-500">
                          {formatRelativeDate(c.lastMessageAt)}
                        </span>
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className="truncate text-caption font-normal text-surface-500">
                          {decodeHtmlEntities(c.type === "request" ? c.title : "Žinutė iš profilio")}
                        </span>
                        <Chip tone={state.tone} className="px-2 py-0 text-[11px]">
                          {state.label}
                        </Chip>
                      </span>
                      <span className={cn("flex items-center gap-2 text-caption", c.unread ? "font-semibold" : "font-normal")}>
                        <span className="min-w-0 flex-1 truncate">
                          {c.fromProvider && "Jūs: "}
                          {decodeHtmlEntities(c.preview)}
                        </span>
                        {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Neperskaityta" />}
                      </span>
                    </span>
                  </button>
                );
              })}
              {!searchQuery.trim() && hasMoreConversations && (
                <button
                  type="button"
                  onClick={loadMoreConversations}
                  disabled={loadingMore}
                  className="mt-2 min-h-11 w-full rounded-lg border border-surface-200 text-body-sm font-semibold text-surface-600 hover:bg-surface-50 disabled:opacity-60"
                >
                  {loadingMore ? "Kraunama…" : "Įkelti senesnius pokalbius"}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      <div className={cn("min-h-0 min-w-0 flex-1 flex-col", selectedId ? "flex" : "hidden md:flex")}>
        {threadError ? (
          <p className="m-auto p-8 text-center text-red-700">{threadError}</p>
        ) : !thread && !loadingThread ? (
          <div className="m-auto p-8 text-center text-surface-500">
            <MessageCircle className="mx-auto mb-3 h-8 w-8 text-surface-300" />
            Pasirinkite pokalbį kairėje.
          </div>
        ) : loadingThread || !thread ? (
          <p className="m-auto text-surface-500">Kraunama…</p>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-surface-100 px-3 py-3 dark:border-surface-800 sm:px-[18px]">
              <button
                type="button"
                onClick={closeThread}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-surface-500 hover:bg-surface-50 md:hidden"
                aria-label="Atgal į pokalbius"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <Avatar name={decodeHtmlEntities(thread.otherParticipantName || thread.title)} image={thread.otherParticipantImage} />
              <div className="min-w-0">
                <strong className="block truncate">{decodeHtmlEntities(thread.otherParticipantName || thread.title)}</strong>
                <span className="block truncate text-caption font-normal text-surface-500">
                  {decodeHtmlEntities(
                    [thread.requestBrief?.title || thread.subtitle, thread.requestBrief?.location, thread.requestBrief?.budget]
                      .filter(Boolean)
                      .join(" · "),
                  )}
                </span>
              </div>
              {selectedConversation && (
                <Chip tone={conversationState(selectedConversation).tone} className="ml-auto hidden sm:inline-flex">
                  {conversationState(selectedConversation).label}
                </Chip>
              )}
              {thread.requestBrief && (
                <RequestBriefDrawer
                  brief={thread.requestBrief}
                  triggerClassName={cn(
                    "border border-surface-200 bg-white text-surface-900 hover:border-brand-600",
                    !selectedConversation && "ml-auto",
                  )}
                />
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-[18px]">
              <ThreadChat
                key={thread.id}
                threadId={thread.id}
                threadKind={thread.type === "response" ? "response" : "directInquiry"}
                initialMessages={thread.initialMessages}
                currentSenderName={session?.user?.name || "Meistras"}
                viewerRole="provider"
                providerId={thread.providerId}
                otherParticipantName={thread.otherParticipantName}
                otherParticipantImage={thread.otherParticipantImage}
                otherParticipantReadAt={thread.otherParticipantReadAt}
                requestBrief={thread.requestBrief}
                hasMoreMessages={thread.hasMoreMessages}
                loadOlderMessages={loadOlderMessages}
                fillHeight
                showTopBorder={false}
                quickReplies={QUICK_REPLIES}
                sendMessage={sendMessage}
                placeholder="Rašykite žinutę…"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
