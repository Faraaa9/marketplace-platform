"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { FileText, Plus } from "lucide-react";

interface Request {
  id: string;
  trackingToken: string;
  title: string;
  category: string;
  status: string;
  createdAt: string;
  _count: { responses: number };
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/paskyra/uzklausos")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setRequests(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingSpinner />;

  const statusMap: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
    PENDING_CONFIRMATION: { label: "Laukia patvirtinimo", variant: "warning" },
    OPEN: { label: "Atidaryta", variant: "success" },
    IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
    CLOSED: { label: "Uždaryta", variant: "default" },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Mano užklausos</h1>
        <Link href="/uzklausos/nauja">
          <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nauja užklausa</Button>
        </Link>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          title="Neturite užklausų"
          description="Pateikite pirmą užklausą ir gaukite pasiūlymus."
          icon={<FileText className="h-12 w-12" />}
          action={<Link href="/uzklausos/nauja"><Button>Pateikti užklausą</Button></Link>}
        />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const status = statusMap[req.status] || statusMap.OPEN;
            const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === req.category)?.label;
            return (
              <Link key={req.id} href={`/uzklausos/sekti/${req.trackingToken}`}>
                <Card hover>
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-body font-medium text-surface-900 dark:text-white">{req.title}</p>
                      <p className="text-body-sm text-surface-500 mt-1">{categoryLabel} &middot; {formatRelativeDate(req.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={status.variant}>{status.label}</Badge>
                      <span className="text-body-sm text-surface-500">{req._count.responses} atsakymų</span>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
