"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SERVICE_CATEGORIES, BUDGET_OPTIONS } from "@/lib/constants";
import { clearGuestRequest } from "@/lib/guest-request";
import { formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import Link from "next/link";
import { MapPin, Clock, Euro, MessageCircle, Send, CheckCircle, XCircle, Shield, UserPlus, Eye, Bell, Zap, Mail, Search as SearchIcon, Handshake, Lock, Star } from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
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
    providerProfile?: { location: string; planType?: string };
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
  status: string;
  acceptedResponseId?: string;
  clientId?: string | null;
  clientName: string;
  createdAt: string;
  responses: ResponseData[];
}

export default function TrackRequestPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState("");
  const [resendingConfirmation, setResendingConfirmation] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

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
      senderName: data.data.senderName,
      sender: data.data.sender,
      status: "sent",
    };
  }, [params.id]);

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

  async function handleResendConfirmation() {
    setResendingConfirmation(true);
    setError("");
    try {
      const res = await fetch(`/api/tracking/${params.id}/resend-confirmation`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        setConfirmationSent(true);
      } else {
        setError(data.error || "Nepavyko išsiųsti patvirtinimo laiško");
      }
    } catch {
      setError("Nepavyko išsiųsti patvirtinimo laiško");
    } finally {
      setResendingConfirmation(false);
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

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === request.category)?.label || request.category;
  const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === request.budget)?.label;
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
    PENDING_CONFIRMATION: { label: "Laukia patvirtinimo", variant: "warning" },
    OPEN: { label: "Atidaryta", variant: "success" },
    IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
    CLOSED: { label: "Uždaryta", variant: "default" },
  };
  const status = statusMap[request.status] || statusMap.OPEN;
  const verificationState = searchParams.get("verification");
  const deliveryState = searchParams.get("delivery");
  const isPendingConfirmation = request.status === "PENDING_CONFIRMATION";
  const isOpen = request.status === "OPEN";
  const isClosed = request.status === "CLOSED";

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant={status.variant}>{status.label}</Badge>
          <span className="text-body-sm text-surface-500">{categoryLabel}</span>
        </div>
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">{request.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-body-sm text-surface-500">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{request.location}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatRelativeDate(request.createdAt)}</span>
          {budgetLabel && <span className="flex items-center gap-1.5"><Euro className="h-4 w-4" />{budgetLabel}</span>}
        </div>
      </div>

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

      {/* Next action guidance */}
      {isOpen && request.responses.length === 0 && (
        <div className="mb-6 rounded-2xl border border-blue-200/60 bg-blue-50/50 p-5 dark:border-blue-800/40 dark:bg-blue-950/30">
          <div className="flex items-center gap-2 mb-1">
            <SearchIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <p className="text-body-sm font-semibold text-blue-900 dark:text-blue-200">Užklausa aktyvuota</p>
          </div>
          <p className="text-body-sm text-blue-800/80 dark:text-blue-300/80">
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

      {isPendingConfirmation && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-500/10">
          <h2 className="text-body font-semibold text-amber-900 dark:text-amber-200">Liko 1 žingsnis — patvirtinkite el. paštą</h2>
          <div className="mt-3 space-y-2">
            <div className="flex items-start gap-2 text-body-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold text-amber-900 dark:text-amber-200 shrink-0">1.</span>
              <span>Patikrinkite savo el. pašto dėžutę (ir spam/šiukšlių aplanką)</span>
            </div>
            <div className="flex items-start gap-2 text-body-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold text-amber-900 dark:text-amber-200 shrink-0">2.</span>
              <span>Spauskite patvirtinimo nuorodą laiške</span>
            </div>
            <div className="flex items-start gap-2 text-body-sm text-amber-800 dark:text-amber-300">
              <span className="font-semibold text-amber-900 dark:text-amber-200 shrink-0">3.</span>
              <span>Po patvirtinimo jūsų užklausa iškart bus perduota tiekėjams ir jie pradės siųsti pasiūlymus</span>
            </div>
          </div>
          <p className="mt-3 text-micro text-amber-700/70 dark:text-amber-400/70">
            Kol el. paštas nepatvirtintas, tiekėjai jūsų užklausos nemato.
          </p>
          {confirmationSent ? (
            <p className="mt-3 text-body-sm font-medium text-emerald-700 dark:text-emerald-400">
              Patvirtinimo laiškas išsiųstas dar kartą. Patikrinkite el. paštą.
            </p>
          ) : (
            <Button className="mt-4" size="sm" variant="outline" onClick={handleResendConfirmation} isLoading={resendingConfirmation}>
              Siųsti patvirtinimo laišką dar kartą
            </Button>
          )}
        </div>
      )}

      <Card className="mb-6">
        <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{request.description}</p>
      </Card>

      {/* Account value / claim — context-aware */}
      <AccountValueBox clientId={request.clientId} trackingToken={params.id as string} onClaimed={fetchRequest} />

      {/* Bookmark reminder for anonymous users */}
      <BookmarkReminder />

      {/* Close request button */}
      {!isClosed && !isPendingConfirmation && (
        <div className="mb-6 flex justify-end">
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
        </div>
      )}

      <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white mb-4">
        Pasiūlymai ({request.responses.length})
      </h2>

      {request.responses.length === 0 ? (
        <EmptyState
          title={isPendingConfirmation ? "Laukiama el. pašto patvirtinimo" : "Kol kas pasiūlymų nėra"}
          description={isPendingConfirmation ? "Patvirtinkite el. paštą ir tada užklausa bus perduota tiekėjams." : "Tiekėjai netrukus peržiūrės jūsų užklausą ir atsiųs pasiūlymus."}
          icon={<MessageCircle className="h-12 w-12" />}
        />
      ) : (
        <div className="space-y-4">
          {request.responses.map((resp) => {
            const isAccepted = request.acceptedResponseId === resp.id;
            return (
              <Card
                key={resp.id}
                className={isAccepted ? "ring-2 ring-emerald-500 border-emerald-500" : ""}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-body font-medium text-surface-900 dark:text-white">{resp.provider.name}</p>
                      {resp.providerBadge && (
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-micro font-medium ${
                          resp.provider.providerProfile?.planType === "PRO"
                            ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                            : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"
                        }`}>
                          <Shield className="h-3 w-3" />
                          {resp.providerBadge}
                        </span>
                      )}
                      {isAccepted && (
                        <Badge variant="success">Priimtas</Badge>
                      )}
                    </div>
                    {resp.provider.providerProfile?.location && (
                      <p className="text-body-sm text-surface-500">{resp.provider.providerProfile.location}</p>
                    )}
                  </div>
                  {resp.price && (
                    <span className="text-heading-3 font-bold text-emerald-600 dark:text-emerald-400">&euro;{resp.price}</span>
                  )}
                </div>
                <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{resp.message}</p>
                <p className="mt-2 text-micro text-surface-400">{formatRelativeDate(resp.createdAt)}</p>

                {/* Accept button — only when request is OPEN */}
                {isOpen && (
                  <div className="mt-3">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        if (confirm(`Ar tikrai norite priimti ${resp.provider.name} pasiūlymą?`)) {
                          handleStatusAction("accept", resp.id);
                        }
                      }}
                      isLoading={actionLoading === resp.id}
                    >
                      <CheckCircle className="h-4 w-4 mr-1.5" />
                      Priimti pasiūlymą
                    </Button>
                  </div>
                )}

                {/* Review form — only for accepted response, not yet reviewed */}
                {isAccepted && !resp.hasReview && (
                  <ReviewForm
                    requestId={request.id}
                    responseId={resp.id}
                    providerName={resp.provider.name}
                    trackingToken={params.id as string}
                    clientId={request.clientId}
                    onSubmitted={fetchRequest}
                  />
                )}

                {/* Review submitted badge */}
                {isAccepted && resp.hasReview && (
                  <div className="mt-3 flex items-center gap-1.5 text-body-sm text-emerald-600 dark:text-emerald-400">
                    <Star className="h-4 w-4 fill-emerald-500 text-emerald-500" />
                    Atsiliepimas pateiktas
                  </div>
                )}

                {/* Thread with optimistic messaging */}
                <ThreadChat
                  responseId={resp.id}
                  initialMessages={resp.messages.map((m) => ({
                    ...m,
                    senderName: m.senderName || m.sender?.name || null,
                    status: "sent" as const,
                  }))}
                  currentSenderName={request.clientName || "Klientas"}
                  sendMessage={sendTrackingMessage}
                  placeholder="Rašyti žinutę tiekėjui..."
                  disabled={isClosed}
                />
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function AccountValueBox({ clientId, trackingToken, onClaimed }: { clientId?: string | null; trackingToken: string; onClaimed: () => void }) {
  const { data: session } = useSession();
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState(false);
  const [claimError, setClaimError] = useState("");

  // Already attached to an account — nothing to show
  if (clientId) return null;

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

  // Anonymous user → show value prop + register CTA
  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="flex items-center gap-2 mb-3">
        <UserPlus className="h-4 w-4 text-brand-600 dark:text-brand-400" />
        <h3 className="text-body font-semibold text-surface-900 dark:text-white">Nori patogiau?</h3>
      </div>
      <ul className="space-y-2 mb-4">
        {[
          { icon: <Eye className="h-3.5 w-3.5" />, text: "Visos užklausos vienoje vietoje" },
          { icon: <Bell className="h-3.5 w-3.5" />, text: "Pranešimai apie naujus pasiūlymus" },
          { icon: <Zap className="h-3.5 w-3.5" />, text: "Greičiau pateiksite būsimas užklausas" },
        ].map((item) => (
          <li key={item.text} className="flex items-center gap-2.5 text-body-sm text-surface-600 dark:text-surface-400">
            <span className="text-brand-500">{item.icon}</span>
            {item.text}
          </li>
        ))}
      </ul>
      <Link
        href="/registruotis"
        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-body-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm"
      >
        <UserPlus className="h-3.5 w-3.5" />
        Sukurti nemokamą paskyrą
      </Link>
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
          const isFuture = i > currentIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
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
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-surface-400"
                  }`}
                >
                  {step.label}
                </span>
                {isCurrent && step.key === "OPEN" && responseCount > 0 && (
                  <span className="mt-0.5 text-micro text-emerald-600 dark:text-emerald-400 font-semibold">
                    {responseCount} pasiūl.
                  </span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full ${
                    i < currentIndex
                      ? "bg-emerald-500"
                      : isFuture
                        ? "bg-surface-200 dark:bg-surface-700"
                        : "bg-brand-200 dark:bg-brand-800"
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
