"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { formatRelativeDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import ThreadChat from "@/components/messaging/ThreadChat";
import type { ThreadMessage } from "@/store/useConversationStore";
import { MapPin, Clock, CalendarClock, Euro, Mail, Phone, User, Send, CheckCircle, Lock, ArrowLeft, AlertTriangle, Settings } from "lucide-react";
import Link from "next/link";
import RequestPhotos from "@/components/requests/RequestPhotos";
import GenerateProposalButton from "@/components/ai/GenerateProposalButton";
import UnlockCard from "./UnlockCard";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  senderId?: string | null;
  senderName?: string;
  sender?: { id: string; name: string };
}

interface ResponseData {
  id: string;
  message: string;
  price?: number;
  createdAt: string;
  provider: { id: string; name: string };
  messages: MessageData[];
}

interface RequestData {
  id: string;
  title: string;
  description: string;
  /** Resolved category name (string), or null if the request has no category. */
  category: string | null;
  location: string;
  budget?: string;
  deadline?: string;
  attachmentUrls?: string[];
  status: string;
  acceptedResponseId?: string;
  clientName: string;
  clientImage?: string | null;
  clientEmail?: string | null;
  clientPhone?: string | null;
  createdAt: string;
  responses: ResponseData[];
  totalResponses?: number;
  isUnlocked?: boolean;
  creditBalance?: number;
  canRespond?: boolean;
  eligibilityCode?: string;
  eligibilityMessage?: string;
}

export default function ProviderRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState("");
  const [responsePrice, setResponsePrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fetchRequest = useCallback(async () => {
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${params.id}`);
      const data = await res.json();
      if (data.success) {
        setRequest(data.data);
      } else if (data.code === "EMAIL_NOT_VERIFIED" || data.code === "ACCOUNT_NOT_ACTIVE") {
        router.push("/tiekejas");
      }
    } catch {} finally { setLoading(false); }
  }, [params.id, router]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  async function handleSubmitResponse() {
    if (responseMessage.length < 10) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${params.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: responseMessage,
          price: responsePrice ? parseFloat(responsePrice) : undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setResponseMessage("");
        setResponsePrice("");
        fetchRequest();
      } else {
        setError(data.error || "Klaida");
      }
    } catch { setError("Klaida"); } finally { setSubmitting(false); }
  }

  const sendThreadMessage = useCallback(async (responseId: string, content: string): Promise<ThreadMessage> => {
    const res = await fetch(`/api/requests/${responseId}/messages`, {
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
      senderId: data.data.sender?.id ?? null,
      senderName: data.data.senderName,
      sender: data.data.sender,
      status: "sent",
    };
  }, []);

  if (loading) return <LoadingSpinner />;
  if (!request) return <EmptyState title="Užklausa nerasta" />;

  const hasResponded = request.responses.some((r) => r.provider.id === session?.user?.id);
  const myResponse = request.responses.find((r) => r.provider.id === session?.user?.id);
  const isMyResponseAccepted = myResponse && request.acceptedResponseId === myResponse.id;
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
    OPEN: { label: "Atidaryta", variant: "success" },
    IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
    CLOSED: { label: "Uždaryta", variant: "default" },
  };
  const statusInfo = statusMap[request.status] || statusMap.OPEN;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <button
        onClick={() => router.push("/tiekejas/uzklausos")}
        className="mb-4 inline-flex items-center gap-1.5 text-body-sm text-surface-500 hover:text-surface-700 transition-colors dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Grįžti į užklausas
      </button>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          {request.category && <Badge variant="brand">{request.category}</Badge>}
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
        </div>
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mt-3">{request.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-body-sm text-surface-500">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{request.location}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatRelativeDate(request.createdAt)}</span>
          {request.budget && <span className="flex items-center gap-1.5"><Euro className="h-4 w-4" />{request.budget}</span>}
          {request.deadline && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{request.deadline}</span>}
        </div>
      </div>

      <Card className="mb-6">
        <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap mb-4">{request.description}</p>
        {request.attachmentUrls && request.attachmentUrls.length > 0 && (
          <div className="mb-4">
            <RequestPhotos urls={request.attachmentUrls} />
          </div>
        )}
        <hr className="border-surface-200/50 dark:border-surface-700 mb-3" />
        <div className="flex flex-wrap gap-4 text-body-sm text-surface-500">
          <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{request.clientName}</span>
          {request.clientEmail ? (
            <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{request.clientEmail}</span>
          ) : (
            <span className="flex items-center gap-1.5 text-surface-400"><Lock className="h-4 w-4" />El. paštas — užrakinta</span>
          )}
          {request.clientPhone ? (
            <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{request.clientPhone}</span>
          ) : (
            <span className="flex items-center gap-1.5 text-surface-400"><Lock className="h-4 w-4" />Telefonas — užrakinta</span>
          )}
        </div>
      </Card>

      {/* Unlock card — eligible but not yet unlocked */}
      {!hasResponded && request.canRespond && !request.isUnlocked && (
        <UnlockCard
          requestId={request.id}
          creditBalance={request.creditBalance ?? 0}
          onUnlocked={fetchRequest}
        />
      )}

      {/* Response form — eligible and unlocked */}
      {!hasResponded && request.canRespond && request.isUnlocked && (
        <Card className="mb-8">
          <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-1">Pateikti pasiūlymą</h3>
          {request.totalResponses != null && (
            <p className={`text-micro mb-4 ${
              request.totalResponses === 0
                ? "text-emerald-600 dark:text-emerald-400"
                : request.totalResponses <= 2
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-surface-400"
            }`}>
              {request.totalResponses === 0
                ? "Dar niekas neatsakė — būkite pirmas!"
                : `Jau ${request.totalResponses} ${request.totalResponses === 1 ? "pasiūlymas" : "pasiūlymai"}`}
            </p>
          )}
          {error && <p className="text-body-sm text-red-500 mb-3">{error}</p>}
          <div className="space-y-4">
            <div>
              <Textarea
                id="response"
                label="Jūsų pasiūlymas"
                placeholder="Aprašykite ką galite pasiūlyti, terminus, sąlygas..."
                value={responseMessage}
                onChange={(e) => setResponseMessage(e.target.value)}
                autoResize
              />
              <div className="mt-1.5 flex items-center justify-between text-micro">
                <span className={responseMessage.length > 0 && responseMessage.length < 10 ? "text-red-500 dark:text-red-400" : "text-surface-400"}>
                  {responseMessage.length > 0 && responseMessage.length < 10
                    ? `Bent 10 simbolių (dar ${10 - responseMessage.length})`
                    : "Bent 10 simbolių"}
                </span>
                <span className={responseMessage.length >= 10 ? "text-emerald-600 dark:text-emerald-400" : "text-surface-400"}>
                  {responseMessage.length}/10
                </span>
              </div>
              <GenerateProposalButton
                requestId={request.id}
                value={responseMessage}
                onChange={setResponseMessage}
                targetId="response"
                className="mt-2"
              />
            </div>
            <Input
              id="price"
              label="Kaina, € (neprivaloma)"
              type="number"
              placeholder="Pvz.: 150"
              value={responsePrice}
              onChange={(e) => setResponsePrice(e.target.value)}
            />
            <Button onClick={handleSubmitResponse} isLoading={submitting} disabled={responseMessage.length < 10}>
              <Send className="h-4 w-4 mr-2" /> Siųsti pasiūlymą
            </Button>
          </div>
        </Card>
      )}

      {/* Eligibility warning — specialization mismatch or missing */}
      {!hasResponded && request.canRespond === false && request.eligibilityCode && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-body-sm font-medium text-amber-800 dark:text-amber-300">
                {request.eligibilityMessage}
              </p>
              {(request.eligibilityCode === "NO_SPECIALIZATIONS" || request.eligibilityCode === "SPECIALIZATION_MISMATCH") && (
                <Link
                  href="/tiekejas/profilis"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-caption font-semibold text-white hover:bg-amber-700 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Redaguoti profilį
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {isMyResponseAccepted && (
        <div className="mb-6 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3.5 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-xs dark:bg-emerald-500/10">
              <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
                Klientas priėmė jūsų pasiūlymą
              </h3>
              <p className="mt-1 text-body-sm text-surface-600 dark:text-surface-300">
                Sveikiname! Liko susisiekti su klientu ir suderinti darbo detales.
              </p>
            </div>
          </div>

          {(request.clientEmail || request.clientPhone) && (
            <div className="border-t border-emerald-200/60 px-5 py-4 dark:border-emerald-800/40">
              <p className="mb-2.5 text-caption font-semibold text-surface-500 dark:text-surface-400">
                Kliento kontaktai
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {request.clientEmail && (
                  <a
                    href={`mailto:${request.clientEmail}`}
                    className="flex min-h-[44px] flex-1 items-center gap-2.5 rounded-xl border border-surface-200/70 bg-white px-3.5 py-2 transition-shadow hover:shadow-soft dark:border-surface-700/50 dark:bg-surface-900"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-surface-400" />
                    <span className="min-w-0 flex-1 truncate text-body-sm text-surface-700 dark:text-surface-200">
                      {request.clientEmail}
                    </span>
                    <span className="shrink-0 text-caption font-semibold text-brand-600 dark:text-brand-400">
                      Rašyti
                    </span>
                  </a>
                )}
                {request.clientPhone && (
                  <a
                    href={`tel:${request.clientPhone}`}
                    className="flex min-h-[44px] flex-1 items-center gap-2.5 rounded-xl border border-surface-200/70 bg-white px-3.5 py-2 transition-shadow hover:shadow-soft dark:border-surface-700/50 dark:bg-surface-900"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-surface-400" />
                    <span className="min-w-0 flex-1 truncate text-body-sm text-surface-700 dark:text-surface-200">
                      {request.clientPhone}
                    </span>
                    <span className="shrink-0 text-caption font-semibold text-brand-600 dark:text-brand-400">
                      Skambinti
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasResponded && !isMyResponseAccepted && (
        <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-body-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Jūs jau atsakėte į šią užklausą
        </div>
      )}

      {request.status !== "OPEN" && !hasResponded && (
        <div className="mb-4 rounded-xl bg-surface-100 p-3 text-body-sm text-surface-500 dark:bg-surface-800 dark:text-surface-400">
          Ši užklausa nebepriima naujų pasiūlymų
        </div>
      )}

      {/* My response */}
      <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white mb-4">
        Mano atsakymas
        {request.totalResponses != null && (
          <span className="text-body-sm font-normal text-surface-400 ml-2">(iš viso atsakymų: {request.totalResponses})</span>
        )}
      </h2>
      <div className="space-y-4">
        {request.responses.map((resp) => {
          const isAccepted = request.acceptedResponseId === resp.id;
          return (
          <Card
            key={resp.id}
            className={isAccepted ? "border-emerald-500 ring-2 ring-emerald-500" : undefined}
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-body font-medium text-surface-900 dark:text-white">{resp.provider.name}</p>
                {isAccepted && <Badge variant="success">Priimtas</Badge>}
              </div>
              {resp.price != null && <span className="text-heading-3 font-bold text-emerald-600 dark:text-emerald-400">&euro;{resp.price}</span>}
            </div>
            <div className="flex flex-col items-end gap-0.5">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-body-sm text-white whitespace-pre-wrap break-words">
                {resp.message}
              </div>
              <span className="px-1 text-micro text-surface-400">{formatRelativeDate(resp.createdAt)}</span>
            </div>

            {/* Thread with optimistic messaging */}
            <ThreadChat
              threadId={resp.id}
              threadKind="response"
              initialMessages={resp.messages.map((m) => ({
                ...m,
                senderName: m.senderName || m.sender?.name || null,
                status: "sent" as const,
              }))}
              currentSenderName={session?.user?.name || "Tiekėjas"}
              viewerRole="provider"
              providerId={resp.provider.id}
              otherParticipantName={request.clientName}
              otherParticipantImage={request.clientImage}
              sendMessage={sendThreadMessage}
              placeholder="Rašyti žinutę..."
              disabled={request.status === "CLOSED"}
            />
          </Card>
          );
        })}
      </div>
    </div>
  );
}
