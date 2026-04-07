"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { SERVICE_CATEGORIES, BUDGET_OPTIONS } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import { MapPin, Clock, Euro, MessageCircle } from "lucide-react";

interface ResponseData {
  id: string;
  message: string;
  price?: number;
  createdAt: string;
  provider: {
    id: string;
    name: string;
    providerProfile?: { planType: string; location: string };
  };
  messages: { id: string; content: string; createdAt: string; sender: { id: string; name: string } }[];
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
  createdAt: string;
  responses: ResponseData[];
}

export default function TrackRequestPage() {
  const params = useParams();
  const [request, setRequest] = useState<RequestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchRequest();
  }, [params.id]);

  async function fetchRequest() {
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
  }

  if (loading) return <LoadingSpinner />;
  if (error || !request) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="Užklausa nerasta" description={error} />
      </div>
    );
  }

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === request.category)?.label || request.category;
  const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === request.budget)?.label;
  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
    OPEN: { label: "Atidaryta", variant: "success" },
    IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
    CLOSED: { label: "Uždaryta", variant: "default" },
  };
  const status = statusMap[request.status] || statusMap.OPEN;

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

      <Card className="mb-8">
        <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap">{request.description}</p>
      </Card>

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
        <div className="space-y-4">
          {request.responses.map((resp) => (
            <Card key={resp.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-body font-medium text-surface-900 dark:text-white">{resp.provider.name}</p>
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

              {resp.messages.length > 0 && (
                <div className="mt-4 border-t border-surface-200/50 pt-4 dark:border-surface-700">
                  <p className="text-body-sm font-medium text-surface-600 dark:text-surface-400 mb-2">Diskusija:</p>
                  <div className="space-y-2">
                    {resp.messages.map((msg) => (
                      <div key={msg.id} className="rounded-xl bg-surface-50 p-3 dark:bg-surface-800">
                        <p className="text-micro font-medium text-surface-500">{msg.sender.name} &middot; {formatRelativeDate(msg.createdAt)}</p>
                        <p className="text-body-sm text-surface-700 dark:text-surface-300">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
