"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { useSession } from "next-auth/react";
import ThreadChat from "@/components/messaging/ThreadChat";
import { Avatar, BUTTON_GHOST } from "@/components/account/ui";
import type { ThreadMessage } from "@/store/useConversationStore";
import { cn, decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";

type Conversation = {
  kind: "response" | "direct";
  threadId: string;
  token: string;
  id: string;
  providerId: string;
  providerName: string;
  providerImage: string | null;
  about: string;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
  fromMe: boolean;
};

type ApiMessage = {
  id: string;
  content: string;
  createdAt: string;
  senderId: string | null;
  senderName?: string | null;
  sender?: { id?: string; name: string | null; image?: string | null } | null;
};

type OpenThread = {
  conversation: Conversation;
  otherReadAt: string | null;
  hasMoreMessages: boolean;
  initialMessages: ThreadMessage[];
};

function toThreadMessage(m: ApiMessage): ThreadMessage {
  return {
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    senderId: m.senderId,
    senderName: m.senderName ?? m.sender?.name ?? null,
    sender: m.sender ? { id: m.sender.id, name: m.sender.name ?? "", image: m.sender.image ?? null } : null,
    status: "sent",
  };
}

async function fetchThread(c: Conversation): Promise<OpenThread> {
  if (c.kind === "response") {
    // The tracker API returns every offer on the request with full history and
    // stamps the customer's read time.
    const res = await fetch(`/api/requests/${encodeURIComponent(c.token)}`, { cache: "no-store" });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || "Klaida");
    const resp = (
      data.data.responses as Array<{
        id: string;
        providerId: string;
        message: string;
        createdAt: string;
        providerLastReadAt?: string | null;
        messages: ApiMessage[];
      }>
    ).find((r) => r.id === c.id);
    if (!resp) throw new Error("Pasiūlymas nerastas");
    return {
      conversation: c,
      otherReadAt: resp.providerLastReadAt ?? null,
      hasMoreMessages: false,
      // The offer text lives on the Response itself; it opens the thread.
      initialMessages: [
        {
          id: `response-${resp.id}`,
          content: resp.message,
          createdAt: resp.createdAt,
          senderId: resp.providerId,
          senderName: c.providerName,
          sender: null,
          status: "sent" as const,
        },
        ...resp.messages.map(toThreadMessage),
      ],
    };
  }
  const res = await fetch(`/api/zinutes/${encodeURIComponent(c.token)}`, { cache: "no-store" });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || "Klaida");
  return {
    conversation: c,
    otherReadAt: data.data.providerLastReadAt ?? null,
    hasMoreMessages: !!data.data.hasMoreMessages,
    // The opening inquiry is stored on the inquiry, not as a message; show it
    // as the customer's first bubble (once the oldest page is loaded).
    initialMessages: [
      ...(data.data.hasMoreMessages
        ? []
        : [
            {
              id: `inquiry-${data.data.id}`,
              content: data.data.description as string,
              createdAt: new Date(data.data.createdAt).toISOString(),
              senderId: null,
              senderName: data.data.senderName ?? null,
              sender: null,
              status: "sent" as const,
            },
          ]),
      ...(data.data.messages as ApiMessage[]).map(toThreadMessage),
    ],
  };
}

/**
 * Two-pane customer inbox: offer threads on the customer's requests and the
 * direct inquiries they sent, in one list. `?thread=` deep links (emails,
 * notifications, the home page) open the matching conversation.
 */
export default function CustomerInbox() {
  const { data: session } = useSession();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [listError, setListError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [thread, setThread] = useState<OpenThread | null>(null);
  const [threadError, setThreadError] = useState("");
  const [loadingThread, setLoadingThread] = useState(false);

  const open = useCallback(async (c: Conversation) => {
    setSelectedId(c.threadId);
    setThread(null);
    setThreadError("");
    setLoadingThread(true);
    window.history.replaceState(null, "", `/paskyra/zinutes?thread=${encodeURIComponent(c.threadId)}`);
    try {
      const loaded = await fetchThread(c);
      setThread(loaded);
      // Opening an offer thread marks the whole request read server-side.
      setConversations((items) =>
        items?.map((item) =>
          item.threadId === c.threadId || (c.kind === "response" && item.kind === "response" && item.token === c.token)
            ? { ...item, unread: false }
            : item,
        ) ?? items,
      );
    } catch {
      setThreadError("Nepavyko įkelti pokalbio.");
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/paskyra/zinutes", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error();
        const items = data.data.conversations as Conversation[];
        setConversations(items);
        const wanted = new URLSearchParams(window.location.search).get("thread");
        const match = wanted ? items.find((c) => c.threadId === wanted || c.id === wanted) : null;
        if (match) void open(match);
        else if (wanted) setThreadError("Pokalbis nerastas arba jau ištrintas.");
      })
      .catch(() => {
        if (!cancelled) {
          setConversations([]);
          setListError("Nepavyko įkelti žinučių.");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const sendMessage = useCallback(
    async (_threadId: string, content: string): Promise<ThreadMessage> => {
      const c = thread?.conversation;
      if (!c) throw new Error("Nėra pokalbio");
      const res = await fetch(
        c.kind === "response" ? `/api/tracking/${c.token}/messages` : `/api/zinutes/${c.token}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(c.kind === "response" ? { responseId: c.id, content } : { content }),
        },
      );
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Klaida");
      const sent = toThreadMessage(data.data);
      setConversations((items) =>
        items
          ?.map((item) =>
            item.threadId === c.threadId
              ? { ...item, preview: sent.content, lastMessageAt: sent.createdAt, fromMe: true, unread: false }
              : item,
          )
          .sort((a, b) => Date.parse(b.lastMessageAt) - Date.parse(a.lastMessageAt)) ?? items,
      );
      return sent;
    },
    [thread],
  );

  const loadOlderMessages = useCallback(
    async (before: string) => {
      const c = thread?.conversation;
      if (!c || c.kind !== "direct") return { messages: [], hasMoreMessages: false };
      const res = await fetch(`/api/zinutes/${c.token}?before=${encodeURIComponent(before)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Klaida");
      return {
        messages: (data.data.messages as ApiMessage[]).map(toThreadMessage),
        hasMoreMessages: !!data.data.hasMoreMessages,
      };
    },
    [thread],
  );

  const selected = conversations?.find((c) => c.threadId === selectedId) ?? thread?.conversation ?? null;

  return (
    <div className="flex h-[calc(100dvh-72px-3.5rem-12rem)] min-h-[520px] overflow-hidden rounded-xl border border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900 md:h-[calc(100dvh-72px-11rem)]">
      <div
        className={cn(
          "min-h-0 w-full flex-col gap-0.5 overflow-y-auto border-r border-surface-100 p-2.5 dark:border-surface-800 md:flex md:w-[300px] md:shrink-0 lg:w-[320px]",
          selectedId ? "hidden" : "flex",
        )}
      >
        {conversations === null ? (
          <p className="p-3 text-surface-500">Kraunama…</p>
        ) : conversations.length === 0 ? (
          <div className="p-4 text-center text-surface-500">
            <MessageCircle className="mx-auto mb-2 h-8 w-8 text-surface-300" />
            {listError || "Pokalbių dar nėra. Kai meistras atsiųs pasiūlymą ar atsakys, pokalbis atsiras čia."}
          </div>
        ) : (
          conversations.map((c) => (
            <button
              key={c.threadId}
              type="button"
              onClick={() => open(c)}
              className={cn(
                "flex w-full items-center gap-2.5 rounded-[10px] p-3 text-left transition-colors",
                c.threadId === selectedId ? "bg-brand-50 dark:bg-brand-500/10" : "hover:bg-surface-50 dark:hover:bg-surface-800",
              )}
            >
              <Avatar name={c.providerName} image={c.providerImage} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <strong className={cn("truncate", c.unread ? "text-surface-900 dark:text-white" : "font-semibold")}>
                    {c.providerName}
                  </strong>
                  <span className="shrink-0 text-micro font-normal text-surface-500">{formatRelativeDate(c.lastMessageAt)}</span>
                </span>
                <span className="block truncate text-caption font-normal text-surface-500">{decodeHtmlEntities(c.about)}</span>
                <span className={cn("flex items-center gap-2 text-caption", c.unread ? "font-semibold" : "font-normal")}>
                  <span className="min-w-0 flex-1 truncate">
                    {c.fromMe && "Jūs: "}
                    {decodeHtmlEntities(c.preview)}
                  </span>
                  {c.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-600" aria-label="Neperskaityta" />}
                </span>
              </span>
            </button>
          ))
        )}
      </div>

      <div className={cn("min-h-0 min-w-0 flex-1 flex-col", selectedId ? "flex" : "hidden md:flex")}>
        {!selected && !threadError ? (
          <div className="grid flex-1 place-items-center p-8 text-center text-surface-500">
            <div>
              <MessageCircle className="mx-auto mb-3 h-8 w-8 text-surface-300" />
              Pasirinkite pokalbį kairėje.
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 border-b border-surface-100 px-3 py-3 dark:border-surface-800 sm:px-[18px]">
              <button
                type="button"
                onClick={() => {
                  setSelectedId(null);
                  setThread(null);
                  setThreadError("");
                  window.history.replaceState(null, "", "/paskyra/zinutes");
                }}
                className="grid min-h-11 min-w-11 place-items-center rounded-lg text-surface-500 hover:bg-surface-50 md:hidden"
                aria-label="Atgal į pokalbius"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {selected && (
                <>
                  <Avatar name={selected.providerName} image={selected.providerImage} />
                  <div className="min-w-0">
                    <strong className="block truncate">{selected.providerName}</strong>
                    <span className="block truncate text-caption font-normal text-surface-500">
                      Dėl: {decodeHtmlEntities(selected.about)}
                    </span>
                  </div>
                  {selected.kind === "response" && (
                    <Link href={`/uzklausos/sekti/${selected.token}`} className={cn(BUTTON_GHOST, "ml-auto hidden sm:inline-flex")}>
                      Atidaryti užklausą
                    </Link>
                  )}
                </>
              )}
            </div>
            <div className="flex min-h-0 flex-1 flex-col px-3 py-3 sm:px-[18px]">
              {threadError ? (
                <p className="m-auto text-red-700">{threadError}</p>
              ) : loadingThread || !thread ? (
                <p className="m-auto text-surface-500">Kraunama…</p>
              ) : (
                <ThreadChat
                  key={thread.conversation.threadId}
                  threadId={thread.conversation.id}
                  threadKind={thread.conversation.kind === "response" ? "response" : "directInquiry"}
                  initialMessages={thread.initialMessages}
                  currentSenderName={session?.user?.name || "Klientas"}
                  viewerRole="client"
                  providerId={thread.conversation.providerId}
                  otherParticipantName={thread.conversation.providerName}
                  otherParticipantImage={thread.conversation.providerImage}
                  otherParticipantReadAt={thread.otherReadAt}
                  realtimeTrackingToken={thread.conversation.token}
                  hasMoreMessages={thread.hasMoreMessages}
                  loadOlderMessages={loadOlderMessages}
                  sendMessage={sendMessage}
                  fillHeight
                  showTopBorder={false}
                  placeholder="Rašykite žinutę…"
                />
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
