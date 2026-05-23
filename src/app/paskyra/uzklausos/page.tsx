"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { formatRelativeDate } from "@/lib/utils";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import EmptyState from "@/components/ui/EmptyState";
import Button from "@/components/ui/Button";
import { FileText, Plus, MapPin, Clock, MessageSquare, ChevronRight, Bell } from "lucide-react";

interface Request {
  id: string;
  trackingToken: string;
  title: string;
  categoryRef: { name: string } | null;
  location: string;
  status: string;
  createdAt: string;
  lastResponseAt: string | null;
  _count: { responses: number };
}

type StatusFilter = "ALL" | "OPEN" | "PENDING_CONFIRMATION" | "IN_PROGRESS" | "CLOSED";

const STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "default" }> = {
  PENDING_CONFIRMATION: { label: "Laukia patvirtinimo", variant: "warning" },
  OPEN: { label: "Atidaryta", variant: "success" },
  IN_PROGRESS: { label: "Vykdoma", variant: "warning" },
  CLOSED: { label: "Uždaryta", variant: "default" },
};

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Visos" },
  { value: "OPEN", label: "Aktyvios" },
  { value: "PENDING_CONFIRMATION", label: "Laukia" },
  { value: "IN_PROGRESS", label: "Vykdomos" },
  { value: "CLOSED", label: "Uždarytos" },
];

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("OPEN");

  useEffect(() => {
    fetch("/api/paskyra/uzklausos")
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setRequests(data.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-surface-900 dark:text-white">
            Mano užklausos
          </h1>
          <Link href="/uzklausos/nauja">
            <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Nauja</Button>
          </Link>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            title="Neturite užklausų"
            description="Pateikite pirmą užklausą ir gaukite pasiūlymus iš paslaugų tiekėjų."
            icon={<FileText className="h-12 w-12" />}
            action={<Link href="/uzklausos/nauja"><Button>Pateikti užklausą</Button></Link>}
          />
        ) : (
          <>
            {/* Filter tabs */}
            <div className="flex gap-1 mb-5 overflow-x-auto rounded-xl bg-surface-100 p-1 dark:bg-surface-800">
              {FILTER_TABS.map((tab) => {
                const count = tab.value === "ALL"
                  ? requests.length
                  : requests.filter((r) => r.status === tab.value).length;
                return (
                  <button
                    key={tab.value}
                    onClick={() => setFilter(tab.value)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-body-sm font-medium transition-all ${
                      filter === tab.value
                        ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                        : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
                    }`}
                  >
                    {tab.label}
                    <span className={`text-micro ${filter === tab.value ? "text-brand-600 dark:text-brand-400" : "text-surface-400"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Request list */}
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-10 text-center dark:border-surface-700 dark:bg-surface-900">
                <p className="text-body-sm text-surface-500">Šioje kategorijoje užklausų nėra</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const now = new Date();
                  return filtered.map((req) => {
                    const status = STATUS_MAP[req.status] || STATUS_MAP.OPEN;
                    const categoryName = req.categoryRef?.name;
                    const hasNewResponse = req.lastResponseAt &&
                      now.getTime() - new Date(req.lastResponseAt).getTime() < 24 * 60 * 60 * 1000;

                  return (
                    <Link key={req.id} href={`/uzklausos/sekti/${req.trackingToken}`} className="group block">
                      <article className={`relative rounded-2xl border bg-white p-5 transition-shadow duration-200 hover:shadow-card dark:bg-surface-900 ${
                        hasNewResponse
                          ? "border-brand-200 dark:border-brand-800/60"
                          : "border-surface-200/60 dark:border-surface-700/50"
                      }`}>
                        {/* Top: title + status */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <h3 className="text-body font-semibold text-surface-900 dark:text-white group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors leading-snug">
                            {req.title}
                          </h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>

                        {/* Meta */}
                        <div className="flex flex-wrap items-center gap-3 text-micro text-surface-400 dark:text-surface-500">
                          {categoryName && (
                            <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-0.5 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                              {categoryName}
                            </span>
                          )}
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {req.location}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeDate(req.createdAt)}
                          </span>
                        </div>

                        {/* Footer: responses + next action */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className={`inline-flex items-center gap-1 text-micro font-medium ${
                              req._count.responses > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-surface-400"
                            }`}>
                              <MessageSquare className="h-3.5 w-3.5" />
                              {req._count.responses} {req._count.responses === 1 ? "pasiūlymas" : "pasiūlymai"}
                            </span>
                            {hasNewResponse && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-micro font-semibold text-brand-600 dark:bg-brand-950 dark:text-brand-400">
                                <Bell className="h-3 w-3" />
                                Naujas!
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <NextActionHint status={req.status} responseCount={req._count.responses} />
                            <ChevronRight className="h-4 w-4 text-surface-300 group-hover:text-brand-500 transition-colors dark:text-surface-600" />
                          </div>
                        </div>
                      </article>
                    </Link>
                  );
                  });
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function NextActionHint({ status, responseCount }: { status: string; responseCount: number }) {
  if (status === "PENDING_CONFIRMATION") {
    return <span className="text-micro text-amber-600 dark:text-amber-400 font-medium">Patvirtinkite el. paštą</span>;
  }
  if (status === "OPEN" && responseCount === 0) {
    return <span className="text-micro text-surface-400">Laukiama pasiūlymų...</span>;
  }
  if (status === "OPEN" && responseCount > 0) {
    return <span className="text-micro text-brand-600 dark:text-brand-400 font-medium">Peržiūrėkite pasiūlymus</span>;
  }
  if (status === "IN_PROGRESS") {
    return <span className="text-micro text-brand-600 dark:text-brand-400 font-medium">Susisiekite su tiekėju</span>;
  }
  return null;
}
