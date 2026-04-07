"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SERVICE_CATEGORIES, BUDGET_OPTIONS } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Textarea from "@/components/ui/Textarea";
import Input from "@/components/ui/Input";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { MapPin, Clock, Euro, Mail, Phone, User, Send } from "lucide-react";

interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string };
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
  category: string;
  location: string;
  budget?: string;
  status: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  createdAt: string;
  responses: ResponseData[];
}

export default function ProviderRequestDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseMessage, setResponseMessage] = useState("");
  const [responsePrice, setResponsePrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [threadMessage, setThreadMessage] = useState<Record<string, string>>({});

  useEffect(() => { fetchRequest(); }, [params.id]);

  async function fetchRequest() {
    try {
      const res = await fetch(`/api/tiekėjas/uzklausos/${params.id}`);
      const data = await res.json();
      if (data.success) setRequest(data.data);
    } catch {} finally { setLoading(false); }
  }

  async function handleSubmitResponse() {
    if (responseMessage.length < 10) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`/api/tiekėjas/uzklausos/${params.id}`, {
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

  async function handleSendThreadMessage(responseId: string) {
    const content = threadMessage[responseId];
    if (!content?.trim()) return;
    try {
      const res = await fetch(`/api/requests/${responseId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      const data = await res.json();
      if (data.success) {
        setThreadMessage((prev) => ({ ...prev, [responseId]: "" }));
        fetchRequest();
      }
    } catch {}
  }

  if (loading) return <LoadingSpinner />;
  if (!request) return <EmptyState title="Užklausa nerasta" />;

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === request.category)?.label;
  const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === request.budget)?.label;
  const hasResponded = request.responses.some((r) => r.provider.id === session?.user?.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-6">
        <Badge variant="brand">{categoryLabel}</Badge>
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mt-3">{request.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-body-sm text-surface-500">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{request.location}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatRelativeDate(request.createdAt)}</span>
          {budgetLabel && <span className="flex items-center gap-1.5"><Euro className="h-4 w-4" />{budgetLabel}</span>}
        </div>
      </div>

      <Card className="mb-6">
        <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap mb-4">{request.description}</p>
        <hr className="border-surface-200/50 dark:border-surface-700 mb-3" />
        <div className="flex flex-wrap gap-4 text-body-sm text-surface-500">
          <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{request.clientName}</span>
          <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{request.clientEmail}</span>
          {request.clientPhone && <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{request.clientPhone}</span>}
        </div>
      </Card>

      {/* Response form */}
      {!hasResponded && request.status === "OPEN" && (
        <Card className="mb-8">
          <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-4">Pateikti pasiūlymą</h3>
          {error && <p className="text-body-sm text-red-500 mb-3">{error}</p>}
          <div className="space-y-4">
            <Textarea
              id="response"
              label="Jūsų pasiūlymas"
              placeholder="Aprašykite ką galite pasiūlyti, terminus, sąlygas..."
              value={responseMessage}
              onChange={(e) => setResponseMessage(e.target.value)}
            />
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

      {hasResponded && (
        <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-body-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Jūs jau atsakėte į šią užklausą
        </div>
      )}

      {/* Responses */}
      <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white mb-4">Atsakymai ({request.responses.length})</h2>
      <div className="space-y-4">
        {request.responses.map((resp) => (
          <Card key={resp.id}>
            <div className="flex justify-between mb-2">
              <p className="text-body font-medium text-surface-900 dark:text-white">{resp.provider.name}</p>
              {resp.price && <span className="text-heading-3 font-bold text-emerald-600 dark:text-emerald-400">&euro;{resp.price}</span>}
            </div>
            <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{resp.message}</p>
            <p className="mt-2 text-micro text-surface-400">{formatRelativeDate(resp.createdAt)}</p>

            {/* Thread */}
            {resp.messages.length > 0 && (
              <div className="mt-3 border-t border-surface-200/50 pt-3 space-y-2 dark:border-surface-700">
                {resp.messages.map((msg) => (
                  <div key={msg.id} className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800">
                    <p className="text-micro text-surface-500">{msg.sender.name} &middot; {formatRelativeDate(msg.createdAt)}</p>
                    <p className="text-body-sm text-surface-700 dark:text-surface-300">{msg.content}</p>
                  </div>
                ))}
              </div>
            )}

            {resp.provider.id === session?.user?.id && (
              <div className="mt-3 flex gap-2">
                <input
                  type="text"
                  placeholder="Rašyti žinutę..."
                  value={threadMessage[resp.id] || ""}
                  onChange={(e) => setThreadMessage((prev) => ({ ...prev, [resp.id]: e.target.value }))}
                  className="flex-1 rounded-xl border border-surface-300 bg-white px-3 py-2 text-body-sm ring-1 ring-transparent focus:border-brand-500 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
                  onKeyDown={(e) => e.key === "Enter" && handleSendThreadMessage(resp.id)}
                />
                <Button size="sm" onClick={() => handleSendThreadMessage(resp.id)}>Siųsti</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
