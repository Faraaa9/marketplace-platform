"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { clearGuestRequest } from "@/lib/guest-request";
import { formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import type { ThreadMessage } from "@/store/useConversationStore";
import Link from "next/link";
import RequestPhotos from "@/components/requests/RequestPhotos";
import {
  MapPin,
  Clock,
  CalendarClock,
  Euro,
  MessageCircle,
  XCircle,
  Eye,
  Search as SearchIcon,
  Handshake,
  Pencil,
  Trash2,
  ArrowUpRight,
} from "lucide-react";
import ProposalCard from "./components/ProposalCard";
import AccountValueBox from "./components/AccountValueBox";
import { FilterChip, BookmarkReminder, StatusTimeline } from "./components/TrackingHelpers";
import {
  type RequestData,
  type SortMode,
  type FilterMode,
  isAwaitingClientReply,
  lastActivityAt,
  comparePrice,
} from "./components/types";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Naujausi" },
  { value: "price-asc", label: "Kaina: nuo pigiausių" },
  { value: "price-desc", label: "Kaina: nuo brangiausių" },
  { value: "active", label: "Pagal aktyvumą" },
];

const EMPTY_MESSAGES: ThreadMessage[] = [];

export default function TrackRequestPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/requests/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
      } else {
        setError(data.error || "Užklausa nerasta");
      }
    } catch {
      setError("Klaida gaunant užklausą");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequest();
  }, [fetchRequest]);

  const sendTrackingMessage = useCallback(async (responseId: string, content: string): Promise<ThreadMessage> => {
    const res = await fetch(`/api/tracking/${params.id}/messages`, {
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
  }, [params.id]);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mountedThreads, setMountedThreads] = useState<Set<string>>(() => new Set());
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const didInitExpand = useRef(false);

  const messagesByResponse = useMemo(() => {
    const map: Record<string, ThreadMessage[]> = {};
    for (const resp of request?.responses ?? []) {
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
  }, [request]);

  const awaitingCount = useMemo(
    () => (request?.responses ?? []).filter(isAwaitingClientReply).length,
    [request],
  );

  const displayedResponses = useMemo(() => {
    const all = request?.responses ?? [];
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
    const acceptedId = request?.acceptedResponseId;
    if (acceptedId) {
      const idx = list.findIndex((r) => r.id === acceptedId);
      if (idx > 0) list.unshift(list.splice(idx, 1)[0]);
    }
    return list;
  }, [request, sortMode, filterMode]);

  useEffect(() => {
    if (didInitExpand.current || !request) return;
    didInitExpand.current = true;
    if (request.acceptedResponseId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedId(request.acceptedResponseId);
    } else if (request.responses.length === 1) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setExpandedId(request.responses[0].id);
    }
  }, [request]);

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
      const res = await fetch(`/api/tracking/${params.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, responseId }),
      });
      const data = await res.json();
      if (data.success) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchRequest();
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
      const res = await fetch(`/api/tracking/${params.id}`, { method: "DELETE" });
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

  if (loading) return <LoadingSpinner />;
  if (error && !request) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="Užklausa nerasta" description={error} />
      </div>
    );
  }
  if (!request) return null;

  const categoryLabel = request.category;
  const statusMap: Record<string, { label: string; variant: "warning" | "brand" | "default" }> = {
    PENDING_CONFIRMATION: { label: "Laukia patvirtinimo", variant: "warning" },
    OPEN: { label: "Atidaryta", variant: "brand" },
    IN_PROGRESS: { label: "Vykdoma", variant: "brand" },
    CLOSED: { label: "Uždaryta", variant: "default" },
  };
  const status = statusMap[request.status] || statusMap.OPEN;
  const displayStatus =
    request.moderationStatus === "PENDING"
      ? { label: "Peržiūrima", variant: "warning" as const }
      : request.moderationStatus === "REJECTED"
        ? { label: "Atmesta", variant: "default" as const }
        : status;
  const verificationState = searchParams.get("verification");
  const deliveryState = searchParams.get("delivery");
  const isOpen = request.status === "OPEN";
  const isClosed = request.status === "CLOSED";
  const isApproved =
    request.moderationStatus !== "PENDING" && request.moderationStatus !== "REJECTED";
  const publicRequestHref = `/uzklausos?search=${encodeURIComponent(request.title)}&open=${encodeURIComponent(request.id)}#uzklausa-${request.id}`;
  const showToolbar = isOpen && request.responses.length > 3;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Badge variant={displayStatus.variant}>{displayStatus.label}</Badge>
            <span className="truncate text-body-sm text-surface-500">{categoryLabel}</span>
          </div>
          {isApproved && (
            <Link
              href={publicRequestHref}
              aria-label="Atidaryti viešą skelbimą"
              title="Atidaryti viešą skelbimą"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-200/80 bg-white/70 text-surface-500 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-surface-700 dark:bg-surface-900/70 dark:text-surface-300 dark:hover:bg-surface-800"
            >
              <ArrowUpRight className="h-4.5 w-4.5" />
            </Link>
          )}
        </div>
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">{request.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-body-sm text-surface-500">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{request.location}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatRelativeDate(request.createdAt)}</span>
          {request.budget && <span className="flex items-center gap-1.5"><Euro className="h-4 w-4" />{request.budget}</span>}
          {request.deadline && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{request.deadline}</span>}
        </div>
      </div>

      {request.moderationStatus === "PENDING" && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-500/10">
          <p className="text-body-sm font-semibold text-amber-900 dark:text-amber-200">
            Užklausa peržiūrima
          </p>
          <p className="mt-0.5 text-body-sm text-amber-800 dark:text-amber-300">
            Jūsų užklausa tikrinama prieš paskelbiant ir kol kas nematoma tiekėjams.
            Paprastai peržiūra trunka neilgai.
          </p>
        </div>
      )}

      {request.moderationStatus === "REJECTED" && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-500/10">
          <p className="text-body-sm font-semibold text-red-900 dark:text-red-200">
            Užklausa nepaskelbta
          </p>
          <p className="mt-0.5 text-body-sm text-red-800 dark:text-red-300">
            Užklausa neatitiko platformos taisyklių dėl netinkamo turinio. Suredaguokite
            tekstą ar nuotraukas ir bandykite dar kartą.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {verificationState === "success" && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-body-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          El. paštas patvirtintas. Užklausa aktyvuota ir perduota tiekėjams.
        </div>
      )}

      {verificationState === "already-confirmed" && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-body-sm text-brand-800 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          Ši užklausa jau buvo patvirtinta anksčiau.
        </div>
      )}

      {verificationState === "expired" && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-body-sm text-amber-800 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          Patvirtinimo nuoroda nebegalioja. Išsiųskite naują patvirtinimo laišką.
        </div>
      )}

      {deliveryState === "failed" && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-body-sm text-red-800 dark:border-red-700 dark:bg-red-500/10 dark:text-red-300">
          Užklausa sukurta, bet patvirtinimo laiško išsiųsti nepavyko. Galite pabandyti dar kartą šiame puslapyje.
        </div>
      )}

      {deliveryState === "mock" && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-body-sm text-brand-800 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          Veikiate development režime: vietoj tikro laiško naudokite dev email preview, kad atidarytumėte patvirtinimo nuorodą.
        </div>
      )}

      <StatusTimeline status={request.status} responseCount={request.responses.length} />

      {isOpen && isApproved && (
        <div className="mb-6 flex items-center gap-1.5 text-body-sm text-surface-500 dark:text-surface-400">
          <Eye className="h-4 w-4 shrink-0" />
          {request.viewCount && request.viewCount > 0 ? (
            <span>
              Jūsų užklausą peržiūrėjo tiekėjų:{" "}
              <span className="font-semibold text-surface-700 dark:text-surface-200">{request.viewCount}</span>
            </span>
          ) : (
            <span>Tiekėjai dar neperžiūrėjo — pirmieji peržiūri per kelias valandas.</span>
          )}
        </div>
      )}

      {isOpen && isApproved && request.responses.length === 0 && (
        <div className="mb-6 rounded-2xl border border-surface-200/60 bg-surface-50 p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="flex items-center gap-2 mb-1">
            <SearchIcon className="h-4 w-4 text-surface-500 dark:text-surface-400" />
            <p className="text-body-sm font-semibold text-surface-900 dark:text-white">Užklausa aktyvuota</p>
          </div>
          <p className="text-body-sm text-surface-500 dark:text-surface-400">
            Tiekėjai mato jūsų užklausą ir netrukus pradės siųsti pasiūlymus. Paprastai pirmieji pasiūlymai ateina per kelias valandas.
          </p>
        </div>
      )}

      {isOpen && request.responses.length > 0 && !request.acceptedResponseId && (
        <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-body-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Turite {request.responses.length} {request.responses.length === 1 ? "pasiūlymą" : "pasiūlymus"}!
            </p>
          </div>
          <p className="text-body-sm text-emerald-800/80 dark:text-emerald-300/80">
            Peržiūrėkite pasiūlymus žemiau. Galite rašyti žinutes tiekėjams ir priimti geriausią pasiūlymą.
          </p>
        </div>
      )}

      {request.status === "IN_PROGRESS" && (
        <div className="mb-6 rounded-2xl border border-brand-200/60 bg-brand-50/50 p-5 dark:border-brand-800/40 dark:bg-brand-950/30">
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <p className="text-body-sm font-semibold text-brand-900 dark:text-brand-200">Pasiūlymas priimtas</p>
          </div>
          <p className="text-body-sm text-brand-800/80 dark:text-brand-300/80">
            Susisiekite su tiekėju per žinučių sistemą žemiau ir suderinkite darbo detales. Kai darbas bus atliktas, galite uždaryti užklausą.
          </p>
        </div>
      )}

      <Card className="mb-6">
        <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{request.description}</p>
        {request.attachmentUrls && request.attachmentUrls.length > 0 && (
          <div className="mt-4">
            <RequestPhotos urls={request.attachmentUrls} />
          </div>
        )}
      </Card>

      <AccountValueBox clientId={request.clientId} trackingToken={params.id as string} onClaimed={fetchRequest} />

      <BookmarkReminder />

      {!isClosed && (
        <div className="mb-6 flex flex-wrap items-center justify-end gap-2">
          {isOpen && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/uzklausos/sekti/${params.id}/redaguoti`)}
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
        <EmptyState
          title="Kol kas pasiūlymų nėra"
          description="Tiekėjai netrukus peržiūrės jūsų užklausą ir atsiųs pasiūlymus."
          icon={<MessageCircle className="h-12 w-12" />}
        />
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
            <div className="space-y-3">
              {displayedResponses.map((resp) => (
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
                  trackingToken={params.id as string}
                  sendMessage={sendTrackingMessage}
                  onReviewSubmitted={fetchRequest}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
