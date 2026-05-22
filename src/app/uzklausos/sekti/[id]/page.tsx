"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn } from "next-auth/react";
import { clearGuestRequest } from "@/lib/guest-request";
import { formatRelativeDate, cn } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Select from "@/components/ui/Select";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import Link from "next/link";
import RequestPhotos from "@/components/requests/RequestPhotos";
import { ChevronDown, MapPin, Clock, CalendarClock, Euro, MessageCircle, Send, CheckCircle, XCircle, Shield, UserPlus, Eye, Bell, Zap, Mail, Search as SearchIcon, Handshake, Lock, Star, Pencil, Trash2, ArrowUpRight } from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  senderId?: string | null;
  senderName?: string;
  sender?: { name: string };
}

interface ResponseData {
  id: string;
  providerId: string;
  message: string;
  price?: number;
  createdAt: string;
  providerBadge?: string | null;
  hasReview?: boolean;
  provider: {
    id: string;
    name: string;
    providerProfile?: { location: string; isVerified?: boolean };
  };
  messages: MessageData[];
}

interface RequestData {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  budget?: string;
  deadline?: string;
  attachmentUrls?: string[];
  status: string;
  moderationStatus?: string;
  acceptedResponseId?: string;
  clientId?: string | null;
  clientName: string;
  createdAt: string;
  viewCount?: number;
  responses: ResponseData[];
}

type SortMode = "newest" | "price-asc" | "price-desc" | "active";
type FilterMode = "all" | "awaiting";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "newest", label: "Naujausi" },
  { value: "price-asc", label: "Kaina: nuo pigiausių" },
  { value: "price-desc", label: "Kaina: nuo brangiausių" },
  { value: "active", label: "Pagal aktyvumą" },
];

const EMPTY_MESSAGES: ThreadMessage[] = [];

function lastMessageOf(resp: ResponseData): MessageData | undefined {
  return resp.messages[resp.messages.length - 1];
}

/** True when the provider sent the last word — the client still owes a reply. */
function isAwaitingClientReply(resp: ResponseData): boolean {
  const last = lastMessageOf(resp);
  const lastSenderId = last ? last.senderId ?? null : resp.providerId;
  return lastSenderId === resp.providerId;
}

function lastActivityAt(resp: ResponseData): string {
  return lastMessageOf(resp)?.createdAt ?? resp.createdAt;
}

function comparePrice(a: ResponseData, b: ResponseData, dir: "asc" | "desc"): number {
  if (a.price == null && b.price == null) return 0;
  if (a.price == null) return 1;
  if (b.price == null) return -1;
  return dir === "asc" ? a.price - b.price : b.price - a.price;
}

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

  // Transform server messages once per fetch so ThreadChat hydration stays
  // referentially stable: a fresh array every render would re-trigger
  // hydration and drop messages sent during the session.
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

  // Auto-open the accepted proposal, or the only one, on first load.
  useEffect(() => {
    if (didInitExpand.current || !request) return;
    didInitExpand.current = true;
    if (request.acceptedResponseId) {
      setExpandedId(request.acceptedResponseId);
    } else if (request.responses.length === 1) {
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

  // The tracking API returns `category` already resolved to the curated
  // category display name.
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

      {/* Status timeline */}
      <StatusTimeline status={request.status} responseCount={request.responses.length} />

      {/* Provider activity — concrete transparency during the wait */}
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

      {/* Next action guidance */}
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

      {/* Account value / claim — context-aware */}
      <AccountValueBox clientId={request.clientId} trackingToken={params.id as string} onClaimed={fetchRequest} />

      {/* Bookmark reminder for anonymous users */}
      <BookmarkReminder />

      {/* Request management actions */}
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

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-body-sm font-medium transition-colors",
        active
          ? "bg-brand-600 text-white"
          : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700",
      )}
    >
      {children}
    </button>
  );
}

function ProposalCard({
  resp,
  isAccepted,
  isOpen,
  isClosed,
  expanded,
  mounted,
  onToggle,
  acceptLoading,
  onAccept,
  initialMessages,
  clientName,
  clientId,
  requestId,
  trackingToken,
  sendMessage,
  onReviewSubmitted,
}: {
  resp: ResponseData;
  isAccepted: boolean;
  isOpen: boolean;
  isClosed: boolean;
  expanded: boolean;
  mounted: boolean;
  onToggle: () => void;
  acceptLoading: boolean;
  onAccept: () => void;
  initialMessages: ThreadMessage[];
  clientName: string;
  clientId?: string | null;
  requestId: string;
  trackingToken: string;
  sendMessage: (responseId: string, content: string) => Promise<ThreadMessage>;
  onReviewSubmitted: () => void;
}) {
  const last = lastMessageOf(resp);
  const snippet = last ? last.content : resp.message;
  const fromClient = last ? (last.senderId ?? null) !== resp.providerId : false;
  const awaiting = !isClosed && isAwaitingClientReply(resp);
  const location = resp.provider.providerProfile?.location;

  return (
    <Card
      className={cn(
        "p-4",
        isAccepted && "border-emerald-500 ring-2 ring-emerald-500",
        !expanded && "transition-shadow hover:shadow-stripe",
      )}
    >
      {/* Collapsed row — always visible, toggles the conversation */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 text-left"
      >
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-surface-400 transition-transform duration-200",
            expanded && "rotate-180",
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body font-medium text-surface-900 dark:text-white">
              {resp.provider.name}
            </span>
            {resp.providerBadge && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-micro font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                <Shield className="h-3 w-3" />
                {resp.providerBadge}
              </span>
            )}
            {isAccepted && <Badge variant="success">Priimtas</Badge>}
          </div>
          {!expanded && (
            <p className="mt-0.5 truncate text-body-sm text-surface-500 dark:text-surface-400">
              {fromClient && <span className="text-surface-400 dark:text-surface-500">Jūs: </span>}
              {snippet}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {resp.price != null && (
            <span className="text-heading-3 font-bold text-emerald-600 dark:text-emerald-400">
              &euro;{resp.price}
            </span>
          )}
          {!expanded && (
            <span className="text-micro text-surface-400">
              {formatRelativeDate(lastActivityAt(resp))}
            </span>
          )}
          {!expanded && awaiting && (
            <span className="flex items-center gap-1 text-micro font-medium text-brand-600 dark:text-brand-400">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Laukia atsakymo
            </span>
          )}
        </div>
      </button>

      {/* Expanded — full proposal text + actions */}
      {expanded && (
        <div className="mt-4 border-t border-surface-200/60 pt-4 dark:border-surface-700">
          {location && (
            <p className="mb-2 text-body-sm text-surface-500 dark:text-surface-400">{location}</p>
          )}
          <div className="flex flex-col items-start gap-0.5">
            <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-surface-50 px-3.5 py-2 text-body-sm text-surface-700 whitespace-pre-wrap break-words dark:bg-surface-800 dark:text-surface-200">
              {resp.message}
            </div>
            <span className="px-1 text-micro text-surface-400">
              {formatRelativeDate(resp.createdAt)}
            </span>
          </div>

          {isOpen && (
            <div className="mt-3">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  if (confirm(`Ar tikrai norite priimti ${resp.provider.name} pasiūlymą?`)) {
                    onAccept();
                  }
                }}
                isLoading={acceptLoading}
              >
                <CheckCircle className="h-4 w-4 mr-1.5" />
                Priimti pasiūlymą
              </Button>
            </div>
          )}

          {isAccepted && !resp.hasReview && (
            <ReviewForm
              requestId={requestId}
              responseId={resp.id}
              providerName={resp.provider.name}
              trackingToken={trackingToken}
              clientId={clientId}
              onSubmitted={onReviewSubmitted}
            />
          )}

          {isAccepted && resp.hasReview && (
            <div className="mt-3 flex items-center gap-1.5 text-body-sm text-emerald-600 dark:text-emerald-400">
              <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
              Atsiliepimas pateiktas
            </div>
          )}
        </div>
      )}

      {/* Conversation — mounted on first open, then kept alive but hidden when
          collapsed so in-session messages and the Realtime subscription survive. */}
      {mounted && (
        <div className={expanded ? "" : "hidden"}>
          <ThreadChat
            threadId={resp.id}
            threadKind="response"
            initialMessages={initialMessages}
            currentSenderName={clientName}
            viewerRole="client"
            providerId={resp.providerId}
            sendMessage={sendMessage}
            placeholder="Rašyti žinutę tiekėjui..."
            disabled={isClosed}
          />
        </div>
      )}
    </Card>
  );
}

function AccountValueBox({ clientId, trackingToken, onClaimed }: { clientId?: string | null; trackingToken: string; onClaimed: () => void }) {
  const { data: session } = useSession();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [accountExists, setAccountExists] = useState(false);

  // Already attached to an account — nothing to show
  if (clientId) return null;

  async function handleCreateAccount() {
    if (password.length < 8) {
      setCreateError("Slaptažodis turi būti bent 8 simbolių");
      return;
    }
    setCreating(true);
    setCreateError("");
    setAccountExists(false);
    try {
      const res = await fetch("/api/requests/create-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingToken, password }),
      });
      const data = await res.json();
      if (data.success) {
        clearGuestRequest();
        await signIn("credentials", {
          email: data.data.email,
          password,
          callbackUrl: "/paskyra/uzklausos",
        });
      } else if (data.code === "ACCOUNT_EXISTS") {
        setAccountExists(true);
        setCreateError(data.error || "Su šiuo el. paštu paskyra jau yra.");
      } else {
        setCreateError(data.error || "Nepavyko sukurti paskyros");
      }
    } catch {
      setCreateError("Klaida");
    } finally {
      setCreating(false);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    setClaimError("");
    try {
      const res = await fetch("/api/requests/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingToken }),
      });
      const data = await res.json();
      if (data.success) {
        clearGuestRequest();
        setClaimed(true);
        onClaimed();
      } else {
        setClaimError(data.error || "Nepavyko priskirti");
      }
    } catch {
      setClaimError("Klaida");
    } finally {
      setClaiming(false);
    }
  }

  // Logged-in user viewing unclaimed request → offer to claim
  if (session) {
    if (claimed) {
      return (
        <div className="mb-6 rounded-xl border border-emerald-200/60 bg-emerald-50 px-4 py-3 dark:border-emerald-800/40 dark:bg-emerald-500/10">
          <p className="text-body-sm text-emerald-700 dark:text-emerald-400">
            Užklausa priskirta jūsų paskyrai. Dabar ją matysite skiltyje &bdquo;Mano užklausos&ldquo;.
          </p>
        </div>
      );
    }

    return (
      <div className="mb-6 rounded-2xl border border-brand-200/60 bg-brand-50/50 p-5 dark:border-brand-800/40 dark:bg-brand-950/30">
        <h3 className="text-body font-semibold text-surface-900 dark:text-white mb-1">
          Priskirti šią užklausą savo paskyrai?
        </h3>
        <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-3">
          Tada ją matysite &bdquo;Mano užklausos&ldquo; skiltyje ir nereikės saugoti nuorodos.
        </p>
        {claimError && (
          <p className="text-body-sm text-red-600 dark:text-red-400 mb-2">{claimError}</p>
        )}
        <Button size="sm" onClick={handleClaim} isLoading={claiming}>
          Priskirti prie mano paskyros
        </Button>
      </div>
    );
  }

  // Anonymous user → value prop + inline, pre-verified account creation
  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <h3 className="text-body font-semibold text-surface-900 dark:text-white">Sukurti nemokamą paskyrą</h3>
      </div>
      <ul className="space-y-2 mb-4">
        {[
          { icon: <Eye className="h-3.5 w-3.5" />, text: "Visos užklausos vienoje vietoje" },
          { icon: <Bell className="h-3.5 w-3.5" />, text: "Pranešimai apie naujus pasiūlymus" },
          { icon: <Zap className="h-3.5 w-3.5" />, text: "Matysite, kiek tiekėjų peržiūrėjo užklausą" },
        ].map((item) => (
          <li key={item.text} className="flex items-center gap-2.5 text-body-sm text-surface-600 dark:text-surface-400">
            <span className="text-brand-500">{item.icon}</span>
            {item.text}
          </li>
        ))}
      </ul>
      <p className="mb-2 text-micro text-surface-500 dark:text-surface-400">
        Paskyra bus sukurta el. paštui, kurį nurodėte užklausoje — pakartotinai jo tvirtinti nereikės.
      </p>
      <div className="space-y-2.5">
        <input
          type="password"
          placeholder="Slaptažodis (bent 8 simboliai)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleCreateAccount(); }}
          className="h-10 w-full rounded-xl border border-surface-200 bg-white px-3.5 text-body-sm text-surface-900 placeholder:text-surface-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
        />
        <Button size="sm" onClick={handleCreateAccount} isLoading={creating}>
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Sukurti paskyrą
        </Button>
      </div>
      {createError && (
        <p className="mt-2 text-body-sm text-red-600 dark:text-red-400">
          {createError}
          {accountExists && (
            <>
              {" "}
              <Link href="/prisijungti" className="font-medium underline">Prisijungti</Link>
            </>
          )}
        </p>
      )}
    </div>
  );
}

function BookmarkReminder() {
  const { data: session } = useSession();
  if (session) return null;

  return (
    <div className="mb-6 rounded-xl bg-surface-50 border border-surface-200/60 px-4 py-3 dark:bg-surface-800/50 dark:border-surface-700/50">
      <p className="text-micro text-surface-500 dark:text-surface-400">
        <span className="font-medium text-surface-600 dark:text-surface-300">Patarimas:</span>{" "}
        Išsaugokite šį puslapį (bookmark), kad lengvai sugrįžtumėte prie savo užklausos.
      </p>
    </div>
  );
}

function StatusTimeline({ status, responseCount }: { status: string; responseCount: number }) {
  const steps = [
    { key: "PENDING_CONFIRMATION", label: "Patvirtinimas", icon: <Mail className="h-4 w-4" /> },
    { key: "OPEN", label: "Pasiūlymų laukimas", icon: <SearchIcon className="h-4 w-4" /> },
    { key: "IN_PROGRESS", label: "Vykdoma", icon: <Handshake className="h-4 w-4" /> },
    { key: "CLOSED", label: "Uždaryta", icon: <Lock className="h-4 w-4" /> },
  ];

  const statusOrder = ["PENDING_CONFIRMATION", "OPEN", "IN_PROGRESS", "CLOSED"];
  const currentIndex = statusOrder.indexOf(status);

  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                    isCompleted
                      ? "bg-brand-500 text-white"
                      : isCurrent
                        ? "bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/50"
                        : "bg-surface-100 text-surface-400 dark:bg-surface-800"
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.icon}
                </div>
                <span
                  className={`mt-1.5 text-micro font-medium text-center ${
                    isCurrent
                      ? "text-brand-600 dark:text-brand-400"
                      : isCompleted
                        ? "text-surface-500 dark:text-surface-400"
                        : "text-surface-400"
                  }`}
                >
                  {step.label}
                </span>
                {isCurrent && step.key === "OPEN" && responseCount > 0 && (
                  <span className="mt-0.5 text-micro text-brand-600 dark:text-brand-400 font-semibold">
                    {responseCount} pasiūl.
                  </span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full ${
                    i < currentIndex
                      ? "bg-brand-500 dark:bg-brand-700"
                      : "bg-surface-200 dark:bg-surface-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ReviewForm({
  requestId,
  responseId,
  providerName,
  trackingToken,
  clientId,
  onSubmitted,
}: {
  requestId: string;
  responseId: string;
  providerName: string;
  trackingToken: string;
  clientId?: string | null;
  onSubmitted: () => void;
}) {
  const { data: session } = useSession();
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [reviewError, setReviewError] = useState("");

  async function handleSubmit() {
    if (rating === 0) {
      setReviewError("Pasirinkite įvertinimą");
      return;
    }
    setSubmitting(true);
    setReviewError("");
    try {
      // Logged-in user who owns the request → use session-auth endpoint
      // Guest (no session or no clientId) → use tracking token endpoint
      const useSessionEndpoint = session?.user?.id && clientId === session.user.id;
      const url = useSessionEndpoint
        ? "/api/reviews"
        : `/api/tracking/${trackingToken}/reviews`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, responseId, rating, comment }),
      });
      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
        onSubmitted();
      } else {
        setReviewError(data.error || "Klaida");
      }
    } catch {
      setReviewError("Klaida pateikiant atsiliepimą");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200/60 bg-emerald-50 p-4 dark:border-emerald-800/40 dark:bg-emerald-500/10">
        <p className="text-body-sm text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
          <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
          Ačiū už atsiliepimą!
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-brand-200/60 bg-brand-50/30 p-4 dark:border-brand-800/40 dark:bg-brand-950/30">
      <p className="text-body-sm font-medium text-surface-900 dark:text-white mb-3">
        Įvertinkite {providerName}
      </p>

      {/* Star rating */}
      <div className="flex gap-1 mb-3">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(0)}
            className="p-0.5 transition-transform hover:scale-110"
          >
            <Star
              className={`h-7 w-7 transition-colors ${
                star <= (hoveredRating || rating)
                  ? "fill-amber-400 text-amber-400"
                  : "text-surface-300 dark:text-surface-600"
              }`}
            />
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 text-body-sm text-surface-500 self-center">
            {rating}/5
          </span>
        )}
      </div>

      {/* Comment */}
      <textarea
        placeholder="Palikite komentarą (neprivaloma)..."
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-700 dark:bg-surface-800 dark:text-white mb-3"
      />

      {reviewError && (
        <p className="text-body-sm text-red-600 dark:text-red-400 mb-2">{reviewError}</p>
      )}

      <Button size="sm" onClick={handleSubmit} isLoading={submitting} disabled={rating === 0}>
        <Star className="h-3.5 w-3.5 mr-1" />
        Pateikti atsiliepimą
      </Button>
    </div>
  );
}
