"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MessageCircle, XCircle, Pencil, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import EmptyState from "@/components/ui/EmptyState";
import { clearGuestRequest } from "@/lib/guest-request";
import { trackEvent } from "@/lib/analytics-events";
import type { ThreadMessage } from "@/store/useConversationStore";
import ProposalCard from "./components/ProposalCard";
import { FilterChip } from "./components/TrackingHelpers";
import {
  type SortMode,
  type FilterMode,
  isAwaitingClientReply,
  isUnreadByClient,
  lastActivityAt,
  comparePrice,
} from "./components/types";
import type { TrackerProposals } from "./data";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Naujausi" },
  { value: "price-asc", label: "Kaina: nuo pigiausių" },
  { value: "price-desc", label: "Kaina: nuo brangiausių" },
  { value: "active", label: "Pagal aktyvumą" },
];

const EMPTY_MESSAGES: ThreadMessage[] = [];

interface ProposalsClientProps {
  trackingToken: string;
  request: TrackerProposals;
}

/**
 * Interactive proposals region of the tracker: owner actions (edit/close/
 * delete), the sort/filter toolbar, and the collapsible proposal cards (each
 * wrapping the realtime ThreadChat leaf). The server section pre-fetches all
 * data; this island owns local UI state and mutations, calling
 * `router.refresh()` to re-stream the server sections after a change.
 */
export default function ProposalsClient({ trackingToken, request }: ProposalsClientProps) {
  const router = useRouter();
  const { data: session } = useSession();

  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mountedThreads, setMountedThreads] = useState<Set<string>>(() => new Set());
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const didInitExpand = useRef(false);

  const sendTrackingMessage = useCallback(
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

  const messagesByResponse = useMemo(() => {
    const map: Record<string, ThreadMessage[]> = {};
    for (const resp of request.responses) {
      map[resp.id] = resp.messages.map((m) => ({
        id: m.id,
        content: m.content,
        createdAt: m.createdAt,
        senderId: m.senderId ?? null,
        senderName: m.senderName || m.sender?.name || null,
        sender: m.sender ?? null,
        status: "sent" as const,
      }));
    }
    return map;
  }, [request.responses]);

  const awaitingCount = useMemo(
    () => request.responses.filter(isAwaitingClientReply).length,
    [request.responses],
  );

  const unreadIds = useMemo(
    () => new Set(request.responses.filter(isUnreadByClient).map((r) => r.id)),
    [request.responses],
  );

  const displayedResponses = useMemo(() => {
    const all = request.responses;
    const list = filterMode === "awaiting" ? all.filter(isAwaitingClientReply) : [...all];
    list.sort((a, b) => {
      switch (sortMode) {
        case "price-asc":
          return comparePrice(a, b, "asc");
        case "price-desc":
          return comparePrice(a, b, "desc");
        case "active":
          return Date.parse(lastActivityAt(b)) - Date.parse(lastActivityAt(a));
        default:
          return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
    });
    const acceptedId = request.acceptedResponseId;
    if (acceptedId) {
      const idx = list.findIndex((r) => r.id === acceptedId);
      if (idx > 0) list.unshift(list.splice(idx, 1)[0]);
    }
    return list;
  }, [request.responses, request.acceptedResponseId, sortMode, filterMode]);

  useEffect(() => {
    if (didInitExpand.current) return;
    didInitExpand.current = true;
    if (request.acceptedResponseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedId(request.acceptedResponseId);
    } else if (request.responses.length === 1) {
      setExpandedId(request.responses[0].id);
    }
  }, [request.acceptedResponseId, request.responses]);

  const toggleProposal = useCallback((id: string) => {
    setMountedThreads((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setExpandedId((cur) => (cur === id ? null : id));
  }, []);

  async function handleStatusAction(action: "accept" | "close", responseId?: string) {
    setActionLoading(action === "accept" ? responseId || action : action);
    try {
      const res = await fetch(`/api/tracking/${trackingToken}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, responseId }),
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
      } else {
        setError(data.error || "Klaida");
      }
    } catch {
      setError("Klaida");
    } finally {
      setActionLoading("");
    }
  }

  async function handleDelete() {
    if (!confirm("Ar tikrai norite ištrinti šią užklausą? Šio veiksmo atšaukti negalėsite.")) return;
    setActionLoading("delete");
    setError("");
    try {
      const res = await fetch(`/api/tracking/${trackingToken}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        clearGuestRequest();
        router.push(session ? "/paskyra/uzklausos" : "/");
      } else {
        setError(data?.error || "Nepavyko ištrinti užklausos");
        setActionLoading("");
      }
    } catch {
      setError("Nepavyko ištrinti. Bandykite dar kartą.");
      setActionLoading("");
    }
  }

  const isOpen = request.status === "OPEN";
  const isClosed = request.status === "CLOSED";
  const showToolbar = isOpen && request.responses.length > 3;

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {!isClosed && (
        <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
          {isOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                trackEvent("request_tracker_edit_clicked", { source: "toolbar" });
                router.push(`/uzklausos/sekti/${trackingToken}/redaguoti`);
              }}
            >
              <Pencil className="h-4 w-4 mr-1.5" />
              Redaguoti
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (confirm("Ar tikrai norite uždaryti šią užklausą? Nauji pasiūlymai nebebus priimami.")) {
                handleStatusAction("close");
              }
            }}
            isLoading={actionLoading === "close"}
          >
            <XCircle className="h-4 w-4 mr-1.5" />
            Uždaryti užklausą
          </Button>
          {isOpen && (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-500/10"
              onClick={handleDelete}
              isLoading={actionLoading === "delete"}
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Ištrinti
            </Button>
          )}
        </div>
      )}

      <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white mb-4">
        Pasiūlymai ({request.responses.length})
      </h2>

      {request.responses.length === 0 ? (
        <div className="rounded-2xl border border-surface-200/60 bg-white p-6 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
          <EmptyState
            title="Kol kas pasiūlymų nėra"
            description="Tiekėjai netrukus peržiūrės tavo užklausą - pasiūlymai atsiras čia."
            icon={<MessageCircle className="h-12 w-12" />}
          />
        </div>
      ) : (
        <>
          {showToolbar && (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <FilterChip active={filterMode === "all"} onClick={() => setFilterMode("all")}>
                  Visi ({request.responses.length})
                </FilterChip>
                <FilterChip
                  active={filterMode === "awaiting"}
                  onClick={() => setFilterMode("awaiting")}
                >
                  Laukia atsakymo ({awaitingCount})
                </FilterChip>
              </div>
              <div className="w-full sm:w-56">
                <Select
                  aria-label="Rūšiuoti pasiūlymus"
                  options={SORT_OPTIONS}
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                />
              </div>
            </div>
          )}

          {displayedResponses.length === 0 ? (
            <div className="rounded-2xl border border-surface-200/60 bg-surface-50 p-6 text-center dark:border-surface-700/50 dark:bg-surface-900/50">
              <p className="text-body-sm text-surface-500 dark:text-surface-400">
                Visi pasiūlymai jau atsakyti.
              </p>
              <button
                onClick={() => setFilterMode("all")}
                className="mt-2 text-body-sm font-medium text-brand-600 transition-colors hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
              >
                Rodyti visus pasiūlymus
              </button>
            </div>
          ) : (
            (() => {
              const unreadDisplayed = displayedResponses.filter((r) => unreadIds.has(r.id));
              const readDisplayed = displayedResponses.filter((r) => !unreadIds.has(r.id));
              const showGroups =
                filterMode === "all" && unreadDisplayed.length > 0 && readDisplayed.length > 0;
              const renderCard = (resp: (typeof displayedResponses)[number]) => (
                <ProposalCard
                  key={resp.id}
                  resp={resp}
                  isAccepted={request.acceptedResponseId === resp.id}
                  isOpen={isOpen}
                  isClosed={isClosed}
                  expanded={expandedId === resp.id}
                  mounted={mountedThreads.has(resp.id) || expandedId === resp.id}
                  onToggle={() => toggleProposal(resp.id)}
                  acceptLoading={actionLoading === resp.id}
                  onAccept={() => handleStatusAction("accept", resp.id)}
                  initialMessages={messagesByResponse[resp.id] ?? EMPTY_MESSAGES}
                  clientName={request.clientName || "Klientas"}
                  clientId={request.clientId}
                  requestId={request.id}
                  trackingToken={trackingToken}
                  sendMessage={sendTrackingMessage}
                  onReviewSubmitted={() => router.refresh()}
                />
              );
              return (
                <div className="space-y-3">
                  {showGroups && (
                    <p className="flex items-center gap-2 text-caption font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500">
                      Nauji
                      <span className="inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-brand-600 px-1.5 text-[11px] font-bold normal-case text-white">
                        {unreadDisplayed.length}
                      </span>
                    </p>
                  )}
                  {unreadDisplayed.map(renderCard)}
                  {showGroups && (
                    <p className="pt-2 text-caption font-semibold uppercase tracking-wide text-surface-400 dark:text-surface-500">
                      Peržiūrėti
                    </p>
                  )}
                  {readDisplayed.map(renderCard)}
                </div>
              );
            })()
          )}
        </>
      )}
    </>
  );
}
