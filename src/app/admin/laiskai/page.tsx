"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Inbox, ChevronLeft, ChevronRight, Clock, CornerUpLeft } from "lucide-react";

interface InboundEmail {
  id: string;
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  textBody: string | null;
  status: string;
  routedMessageId: string | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS = [
  { value: "", label: "Visi" },
  { value: "INBOX", label: "Gauti" },
  { value: "ROUTED", label: "Pokalbiuose" },
];

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ką tik";
  if (mins < 60) return `prieš ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `prieš ${hours} val`;
  const days = Math.floor(hours / 24);
  return `prieš ${days} d`;
}

export default function AdminInboundEmailsPage() {
  const [items, setItems] = useState<InboundEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/laiskai?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setPagination(data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [fetchItems]);

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-2">
        <Inbox className="h-6 w-6 text-brand-600 dark:text-brand-400" />
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Gauti laiškai
        </h1>
      </div>
      <p className="mb-6 text-body-sm text-surface-500">
        Laiškai, gauti per Resend inbound webhook. Atsakymai į pasiūlymus
        automatiškai patenka į pokalbį; visi kiti lieka čia.
      </p>

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800 w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-body-sm font-medium transition-all ${
              statusFilter === tab.value
                ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-surface-200/60 bg-white p-12 text-center dark:border-surface-700/50 dark:bg-surface-900">
          <p className="text-body-sm text-surface-500">Gautų laiškų nėra.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((email) => (
            <div
              key={email.id}
              className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {email.status === "ROUTED" ? (
                      <Badge variant="success">
                        <CornerUpLeft className="mr-1 inline h-3 w-3" />
                        Pokalbyje
                      </Badge>
                    ) : (
                      <Badge variant="default">Gauta</Badge>
                    )}
                    <h3 className="truncate font-semibold text-surface-900 dark:text-white">
                      {email.subject || "(be temos)"}
                    </h3>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-surface-500">
                    <span>
                      <span className="font-medium">Nuo:</span> {email.fromAddress}
                    </span>
                    <span>
                      <span className="font-medium">Kam:</span> {email.toAddress}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeDate(email.createdAt)}
                    </span>
                  </div>
                </div>
              </div>

              {email.textBody && (
                <div className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface-50 p-3 text-body-sm text-surface-700 dark:bg-surface-800/50 dark:text-surface-300">
                  {email.textBody}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-micro text-surface-500">
            Rodoma {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} iš{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-surface-300 p-2 text-surface-500 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:border-surface-600 dark:hover:bg-surface-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-body-sm text-surface-700 dark:text-surface-300">
              {page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="rounded-xl border border-surface-300 p-2 text-surface-500 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:border-surface-600 dark:hover:bg-surface-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
