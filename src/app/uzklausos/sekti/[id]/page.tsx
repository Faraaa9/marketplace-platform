"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { SERVICE_CATEGORIES, BUDGET_OPTIONS } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { MapPin, Clock, Euro, MessageCircle, Send, CheckCircle, XCircle, Shield } from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  senderName?: string;
  sender?: { name: string };
}

interface ResponseData {
  id: string;
  message: string;
  price?: number;
  createdAt: string;
  providerBadge?: string | null;
  provider: {
    name: string;
    providerProfile?: { location: string; planType?: string };
  };
  messages: MessageData[];
}

interface RequestData {
  title: string;
  description: string;
  category: string;
  location: string;
  budget?: string;
  status: string;
  acceptedResponseId?: string;
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
  const [threadMessage, setThreadMessage] = useState<Record<string, string>>({});
  const [sendingThread, setSendingThread] = useState<Record<string, boolean>>({});
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

  async function handleSendMessage(responseId: string) {
    const content = threadMessage[responseId];
    if (!content?.trim()) return;

    setSendingThread((prev) => ({ ...prev, [responseId]: true }));
    try {
      const res = await fetch(`/api/tracking/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responseId, content }),
      });
      const data = await res.json();
      if (data.success) {
        setThreadMessage((prev) => ({ ...prev, [responseId]: "" }));
        fetchRequest();
      }
    } catch {} finally {
      setSendingThread((prev) => ({ ...prev, [responseId]: false }));
    }
  }

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

      {isPendingConfirmation && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-700 dark:bg-amber-500/10">
          <h2 className="text-body font-semibold text-amber-900 dark:text-amber-200">Patvirtinkite el. paštą</h2>
          <p className="mt-2 text-body-sm text-amber-800 dark:text-amber-300">
            Jūsų užklausa dar nėra aktyvi. Kol nepatvirtinsite el. pašto, tiekėjai jos nematys ir negaus pranešimų.
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

      <Card className="mb-8">
        <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{request.description}</p>
      </Card>

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

                {/* Thread messages */}
                {resp.messages.length > 0 && (
                  <div className="mt-4 border-t border-surface-200/50 pt-4 dark:border-surface-700">
                    <p className="text-body-sm font-medium text-surface-600 dark:text-surface-400 mb-2">Diskusija:</p>
                    <div className="space-y-2">
                      {resp.messages.map((msg) => (
                        <div key={msg.id} className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800">
                          <p className="text-micro font-medium text-surface-500">
                            {msg.sender?.name || msg.senderName || "Klientas"} &middot; {formatRelativeDate(msg.createdAt)}
                          </p>
                          <p className="text-body-sm text-surface-700 dark:text-surface-300">{msg.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Message composer */}
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    placeholder="Rašyti žinutę tiekėjui..."
                    value={threadMessage[resp.id] || ""}
                    onChange={(e) => setThreadMessage((prev) => ({ ...prev, [resp.id]: e.target.value }))}
                    className="flex-1 rounded-xl border border-surface-300 bg-white px-3 py-2 text-body-sm ring-1 ring-transparent focus:border-brand-500 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
                    onKeyDown={(e) => e.key === "Enter" && !sendingThread[resp.id] && handleSendMessage(resp.id)}
                  />
                  <Button
                    size="sm"
                    onClick={() => handleSendMessage(resp.id)}
                    isLoading={sendingThread[resp.id]}
                    disabled={!threadMessage[resp.id]?.trim()}
                  >
                    <Send className="h-3.5 w-3.5 mr-1" />
                    Siųsti
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
