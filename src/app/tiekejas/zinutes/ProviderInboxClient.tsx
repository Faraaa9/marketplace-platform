"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, MoreHorizontal, Search, Settings } from "lucide-react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import EmptyState from "@/components/ui/EmptyState";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { RequestBrief } from "@/components/messaging/RequestBriefDrawer";
import type { ThreadMessage } from "@/store/useConversationStore";
import { formatRelativeDate } from "@/lib/utils";

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
  otherParticipantReadAt?: string | null;
  requestBrief?: RequestBrief | null;
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
  messages: ApiThreadMessage[];
};

function toThreadId(conversation: Conversation) {
  return conversation.href.split("/").pop() || conversation.id;
}

function isSenderDirectConversation(conversation: Conversation) {
  return conversation.type === "direct" && conversation.href.startsWith("/zinutes/");
}

function initials(name: string) {
  return name.trim().slice(0, 1).toUpperCase() || "?";
}

function normalizeDirectThread(data: DirectThreadResponse): ThreadData {
  const senderDisplay = data.senderName?.trim() || data.senderAccountName?.trim() || data.senderEmail;
  return {
    type: "direct",
    id: data.id,
    providerId: data.providerId,
    viewerRole: "provider",
    title: senderDisplay,
    subtitle: data.senderEmail,
    status: data.status,
    otherParticipantName: senderDisplay,
    otherParticipantImage: data.senderImage ?? null,
    otherParticipantReadAt: data.clientLastReadAt ?? null,
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
    otherParticipantReadAt: data.providerLastReadAt ?? null,
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

export default function ProviderInboxClient() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadData | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [listError, setListError] = useState("");
  const [threadError, setThreadError] = useState("");

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
    fetch("/api/tiekejas/zinutes")
      .then((r) => r.json())
      .then((data) => {
        if (cancelled || !data.success) return;
        const loadedConversations = data.data.conversations as Conversation[];
        setConversations(loadedConversations);
        const initialThread = new URLSearchParams(window.location.search).get("thread");
        const initialConversation = loadedConversations.find((c) => toThreadId(c) === initialThread);
        if (initialConversation) {
          void selectConversation(initialConversation);
        }
      })
      .catch(() => {
        if (!cancelled) setListError("Nepavyko įkelti žinučių.");
      })
      .finally(() => {
        if (!cancelled) setLoadingList(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectConversation]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => toThreadId(c) === selectedId) ?? null,
    [conversations, selectedId],
  );

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
    return {
      id: data.data.id,
      content: data.data.content,
      createdAt: data.data.createdAt,
      senderId: data.data.sender?.id ?? data.data.senderId ?? null,
      senderName: data.data.senderName,
      sender: data.data.sender,
      status: "sent",
    };
  }, [thread]);

  return (
    <div className="-mb-[calc(3.5rem+env(safe-area-inset-bottom))] bg-[#ece9e2] px-3 py-3 md:mb-0 md:px-5 md:py-5 dark:bg-surface-950">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-2xl border border-[#ece9e2] bg-white shadow-[0_4px_30px_rgba(0,0,0,0.03)] dark:border-surface-800 dark:bg-surface-900/90">
        <div className="grid h-[calc(100dvh-6rem)] min-h-[560px] lg:grid-cols-[360px_minmax(0,1fr)]">
          <aside className={`${selectedId ? "hidden lg:flex" : "flex"} min-h-0 flex-col border-r border-[#ece9e2] bg-white dark:border-surface-700/60 dark:bg-surface-950/40`}>
            <div className="flex min-h-[64px] items-center justify-between border-b border-[#ece9e2] bg-white px-5 py-2.5 dark:border-surface-700/60">
              <div>
                <p className="text-body font-semibold text-[#1E1B18] dark:text-white">Visos žinutės</p>
                <Link href="/tiekejas" className="inline-flex items-center gap-1 text-micro text-[#6B6760] hover:text-[#1E1B18]">
                  <ArrowLeft className="h-3 w-3" />
                  Valdymo panelė
                </Link>
              </div>
              <button className="grid min-h-11 min-w-11 place-items-center rounded-full border border-[#ece9e2] bg-white text-[#6B6760] transition hover:bg-[#faeee7] hover:text-[#1E1B18] dark:bg-surface-900 dark:ring-surface-700">
                <Search className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3.5">
              {loadingList ? (
                <div>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-[#ece9e2] bg-white p-3">
                      <div className="flex items-start gap-3.5">
                        <div className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-[#F5F3EF]" />
                        <div className="min-w-0 flex-1 space-y-2 pt-1">
                          <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#F5F3EF]" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-[#F5F3EF]" />
                          <div className="h-3 w-5/6 animate-pulse rounded bg-[#F5F3EF]" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.length === 0 ? (
                <EmptyState title={listError || "Žinučių dar nėra"} icon={<MessageCircle className="h-12 w-12" />} />
              ) : (
                <div>
                  {conversations.map((c) => {
                    const id = toThreadId(c);
                    const active = id === selectedId;
                    const status = c.type === "request" ? REQUEST_STATUS[c.status] : null;
                    const online = c.status === "OPEN" || c.status === "IN_PROGRESS";
                    return (
                      <button key={`${c.type}-${c.id}`} onClick={() => selectConversation(c)} className="group block w-full text-left">
                        <article className={`relative border-b border-[#ece9e2]/60 p-3 transition-all hover:bg-[#faeee7] ${
                          active
                            ? "bg-[#faeee7]"
                            : c.unread
                              ? "bg-[#ece9e2]/40"
                              : "bg-white"
                        }`}>
                          {active && <span className="hidden" aria-hidden="true" />}
                          <div className="flex items-start gap-3.5">
                            <div className="relative shrink-0">
                              <div className="grid h-11 w-11 place-items-center rounded-full bg-[#ece9e2]/40 text-caption font-semibold text-[#1E1B18] ring-1 ring-[#ece9e2]">
                                {initials(c.title)}
                              </div>
                              {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#C29B74]" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start gap-2">
                                <h3 className="min-w-0 flex-1 truncate text-body-sm font-semibold text-[#1E1B18]">{c.title}</h3>
                                {status ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium leading-4 text-[#6B6760]">
                                    <span className={`h-1.5 w-1.5 rounded-full ${status.color}`} />
                                    {status.label}
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium leading-4 text-[#6B6760]">Tiesioginė</span>
                                )}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2">
                                {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-[#C29B74]" />}
                                <p className="min-w-0 flex-1 truncate text-micro text-[#6B6760]">{c.subtitle}</p>
                              </div>
                              <div className="mt-1.5 flex items-start gap-2">
                                <p className="min-w-0 flex-1 line-clamp-1 text-body-sm font-normal text-[#6B6760]">{c.fromProvider && <span>Jūs: </span>}{c.preview}</p>
                                <time className="shrink-0 text-[11px] font-medium leading-5 text-[#6B6760]" dateTime={c.lastMessageAt}>
                                  {formatRelativeDate(new Date(c.lastMessageAt))}
                                </time>
                              </div>
                            </div>
                          </div>
                        </article>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <main className={`${selectedId ? "flex" : "hidden lg:flex"} min-h-0 min-w-0 flex-col bg-[#ece9e2] dark:bg-surface-900`}>
            {threadError ? (
              <div className="grid min-h-0 flex-1 place-items-center p-8 text-center text-body-sm text-red-600">
                {threadError}
              </div>
            ) : !thread && !loadingThread ? (
              <div className="grid min-h-0 flex-1 place-items-center p-8 text-center">
                <div>
                  <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#ece9e2]/40 text-[#C29B74]">
                    <MessageCircle className="h-7 w-7" />
                  </div>
                  <h1 className="mt-4 text-heading-2 font-semibold text-[#1E1B18]">Pasirinkite pokalbį</h1>
                  <p className="mt-2 max-w-sm text-body-sm text-[#6B6760]">Kairėje pasirinkite klientą arba užklausą.</p>
                </div>
              </div>
            ) : loadingThread || !thread ? (
              <div className="grid min-h-0 flex-1 place-items-center text-body-sm text-[#6B6760]">Kraunama...</div>
            ) : (
              <>
                <div className="flex min-h-[54px] items-center justify-between gap-3 border-b border-[#ece9e2] bg-white px-4 py-1.5 dark:border-surface-700/60 md:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                  <button className="grid min-h-11 min-w-11 place-items-center rounded-xl text-[#6B6760] hover:bg-[#faeee7] hover:text-[#1E1B18] lg:hidden" onClick={() => setSelectedId(null)}>
                    <ArrowLeft className="h-5 w-5" />
                  </button>
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#ece9e2]/40 text-caption font-semibold text-[#1E1B18] ring-1 ring-[#ece9e2]">
                      {initials(thread.title)}
                    </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 leading-tight">
                      <span className="h-2 w-2 shrink-0 rounded-full bg-[#C29B74]" aria-hidden="true" />
                      <p className="truncate text-body font-semibold text-[#1E1B18]">{thread.title}</p>
                      <span className="rounded-full bg-[#F5F3EF] px-2 py-0.5 text-micro font-medium text-[#6B6760]">
                        {selectedConversation?.type === "direct" ? "Tiesioginė" : "Užklausa"}
                      </span>
                    </div>
                    {thread.subtitle && <p className="mt-0.5 truncate text-caption text-[#6B6760]">{thread.subtitle}</p>}
                  </div>
                  </div>
                  <div className="hidden items-center gap-1 sm:flex">
                    <button className="grid min-h-9 min-w-9 place-items-center rounded-xl border border-[#ece9e2] bg-white text-[#6B6760] transition hover:bg-[#faeee7] hover:text-[#1E1B18]">
                      <Settings className="h-4 w-4" />
                    </button>
                    <button className="grid min-h-9 min-w-9 place-items-center rounded-xl border border-[#ece9e2] bg-white text-[#6B6760] transition hover:bg-[#faeee7] hover:text-[#1E1B18]">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div
                  className="flex min-h-0 flex-1 flex-col bg-[#ece9e2] px-4 py-4 md:px-5"
                >
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
