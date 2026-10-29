"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Star } from "lucide-react";
import ThreadChat from "@/components/messaging/ThreadChat";
import { refreshAccountSummary } from "@/components/account/AccountSidebar";
import { BUTTON_GHOST, EmptyPanel, Panel } from "@/components/account/ui";
import type { ThreadMessage } from "@/store/useConversationStore";
import { cn } from "@/lib/utils";
import ProposalCard from "./components/ProposalCard";
import ReviewForm from "./components/ReviewForm";
import { comparePrice, isUnreadByClient, type ResponseData } from "./components/types";
import type { TrackerProposals } from "./data";

type SortMode = "new" | "cheap" | "rating";

const SORTS: { value: SortMode; label: string }[] = [
  { value: "new", label: "Naujausi" },
  { value: "cheap", label: "Pigiausi" },
  { value: "rating", label: "Geriausiai įvertinti" },
];

function toThreadMessages(resp: ResponseData): ThreadMessage[] {
  return resp.messages.map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt,
    senderId: m.senderId ?? null,
    senderName: m.senderName || m.sender?.name || null,
    sender: m.sender ?? null,
    status: "sent" as const,
  }));
}

/**
 * Offers on a request, rendered as comparable cards. "Pasirinkti" uses the
 * existing accept flow (tracking-token PATCH), "Rašyti" opens that offer's
 * thread inline. Mutations call router.refresh() so the server sections
 * (status chip, step bar) re-stream.
 */
export default function ProposalsClient({ trackingToken, request }: { trackingToken: string; request: TrackerProposals }) {
  const router = useRouter();
  const [sort, setSort] = useState<SortMode>("new");
  const [chatId, setChatId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [error, setError] = useState("");

  const isOpen = request.status === "OPEN";
  const isClosed = request.status === "CLOSED";
  const accepted = request.responses.find((r) => r.id === request.acceptedResponseId) ?? null;

  const sorted = useMemo(() => {
    const list = [...request.responses];
    list.sort((a, b) => {
      if (sort === "cheap") return comparePrice(a, b, "asc");
      if (sort === "rating") {
        const ra = a.provider.providerProfile?.rating ?? -1;
        const rb = b.provider.providerProfile?.rating ?? -1;
        if (rb !== ra) return rb - ra;
        return (b.provider.providerProfile?.reviewCount ?? 0) - (a.provider.providerProfile?.reviewCount ?? 0);
      }
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
    return list;
  }, [request.responses, sort]);

  const sendMessage = useCallback(
    async (responseId: string, content: string): Promise<ThreadMessage> => {
      const res = await fetch(`/api/tracking/${trackingToken}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId, content }),
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
    [trackingToken],
  );

  async function accept(resp: ResponseData) {
    if (!confirm(`Pasirinkti ${resp.provider.name}? Meistras gaus jūsų kontaktus, o kiti pasiūlymai nebebus priimami.`)) return;
    setAccepting(resp.id);
    setError("");
    try {
      const res = await fetch(`/api/tracking/${trackingToken}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", responseId: resp.id }),
      });
      const data = await res.json().catch(() => null);
      if (data?.success) {
        router.refresh();
        refreshAccountSummary();
      } else setError(data?.error || "Nepavyko pasirinkti pasiūlymo");
    } catch {
      setError("Nepavyko pasirinkti pasiūlymo");
    } finally {
      setAccepting(null);
    }
  }

  const chatResp = chatId ? request.responses.find((r) => r.id === chatId) ?? null : null;

  return (
    <>
      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-body-sm text-red-800 dark:bg-red-500/10 dark:text-red-300">{error}</p>
      )}

      {accepted && (
        <div className="flex items-start gap-3 rounded-xl bg-emerald-50 px-4 py-3.5 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
          <Check className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.2} />
          <div>
            <p className="font-semibold">Pasirinkote: {accepted.provider.name}</p>
            <p className="text-caption font-normal opacity-90">
              Meistras gavo jūsų kontaktus ir susisieks. Kai darbas bus atliktas, galėsite jį įvertinti.
            </p>
          </div>
        </div>
      )}

      {accepted && (
        <div id="ivertinti" className="scroll-mt-24">
          {accepted.hasReview ? (
            <p className="flex items-center gap-1.5 text-body-sm font-medium text-emerald-700 dark:text-emerald-400">
              <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" /> Atsiliepimas pateiktas — ačiū!
            </p>
          ) : (
            <ReviewForm
              requestId={request.id}
              responseId={accepted.id}
              providerName={accepted.provider.name}
              trackingToken={trackingToken}
              clientId={request.clientId}
              onSubmitted={() => router.refresh()}
            />
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Pasiūlymai ({request.responses.length})</h2>
        {request.responses.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Rūšiuoti pasiūlymus">
            <span className="text-caption font-normal text-surface-500">Rūšiuoti:</span>
            {SORTS.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={sort === s.value}
                onClick={() => setSort(s.value)}
                className={cn(
                  "min-h-9 rounded-full border px-3 text-caption font-medium transition-colors",
                  sort === s.value
                    ? "border-surface-900 bg-surface-900 text-white dark:border-white dark:bg-white dark:text-surface-900"
                    : "border-surface-200 bg-white text-surface-700 hover:border-surface-400 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {request.responses.length === 0 ? (
        <EmptyPanel>
          {isClosed ? "Užklausa uždaryta, pasiūlymų negauta." : "Kol kas pasiūlymų nėra — kai meistras atsiųs, jis atsiras čia ir gausite pranešimą."}
        </EmptyPanel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
          {sorted.map((resp) => (
            <ProposalCard
              key={resp.id}
              resp={resp}
              unread={
                accepted || !isUnreadByClient(resp)
                  ? null
                  : !resp.clientLastReadAt || Date.parse(resp.createdAt) > Date.parse(resp.clientLastReadAt)
                    ? "offer"
                    : "message"
              }
              isPicked={resp.id === request.acceptedResponseId}
              dimmed={!!accepted && resp.id !== request.acceptedResponseId}
              canPick={isOpen && !accepted}
              accepting={accepting === resp.id}
              chatOpen={chatId === resp.id}
              onPick={() => accept(resp)}
              onChat={() => setChatId(resp.id)}
            />
          ))}
        </div>
      )}

      {chatResp && (
        <Panel className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold">Pokalbis su {chatResp.provider.name}</h2>
            <button type="button" onClick={() => setChatId(null)} className={BUTTON_GHOST}>
              Uždaryti
            </button>
          </div>
          <ThreadChat
            key={chatResp.id}
            threadId={chatResp.id}
            threadKind="response"
            initialMessages={toThreadMessages(chatResp)}
            currentSenderName={request.clientName || "Klientas"}
            viewerRole="client"
            providerId={chatResp.providerId}
            otherParticipantName={chatResp.provider.name}
            otherParticipantImage={chatResp.provider.image}
            otherParticipantReadAt={chatResp.providerLastReadAt ?? null}
            realtimeTrackingToken={trackingToken}
            sendMessage={sendMessage}
            placeholder="Rašykite žinutę…"
            disabled={isClosed}
          />
        </Panel>
      )}
    </>
  );
}
