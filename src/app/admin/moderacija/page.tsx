"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  ShieldAlert,
} from "lucide-react";

interface ModerationItem {
  type: string;
  typeLabel: string;
  id: string;
  title: string;
  excerpt: string;
  moderationStatus: string;
  moderationReason: string | null;
  submittedBy: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_TABS = [
  { value: "PENDING", label: "Laukia" },
  { value: "APPROVED", label: "Patvirtinti" },
  { value: "REJECTED", label: "Atmesti" },
];

const TYPE_TABS = [
  { value: "", label: "Visi" },
  { value: "request", label: "Skelbimai" },
  { value: "profile", label: "Profiliai" },
  { value: "review", label: "Atsiliepimai" },
  { value: "story", label: "Story" },
  { value: "inquiry", label: "Užklausimai" },
];

function statusVariant(status: string): "warning" | "success" | "danger" | "default" {
  switch (status) {
    case "PENDING": return "warning";
    case "APPROVED": return "success";
    case "REJECTED": return "danger";
    default: return "default";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "PENDING": return "Laukia";
    case "APPROVED": return "Patvirtinta";
    case "REJECTED": return "Atmesta";
    default: return status;
  }
}

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

export default function AdminModerationPage() {
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [actionItem, setActionItem] = useState<ModerationItem | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("status", statusFilter);
    if (typeFilter) params.set("type", typeFilter);
    params.set("page", String(page));
    try {
      const res = await fetch(`/api/admin/moderation?${params}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        setPagination(data.pagination);
      }
    } finally {
      setLoading(false);
    }
  }, [statusFilter, typeFilter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchItems();
  }, [statusFilter, typeFilter, page, fetchItems]);

  function openAction(item: ModerationItem, type: "approve" | "reject") {
    setActionItem(item);
    setActionType(type);
    setReviewNotes("");
    setActionError(null);
  }

  function closeAction() {
    setActionItem(null);
    setActionType(null);
    setReviewNotes("");
    setActionError(null);
  }

  async function handleAction() {
    if (!actionItem || !actionType) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(
        `/api/admin/moderation/${actionItem.type}/${actionItem.id}/${actionType}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reviewNotes: reviewNotes || undefined }),
        },
      );
      const data = await res.json();

      if (!data.success) {
        setActionError(data.error || "Veiksmas nepavyko");
        setActionLoading(false);
        return;
      }

      closeAction();
      fetchItems();
    } catch {
      setActionError("Tinklo klaida");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="h-6 w-6 text-brand-600 dark:text-brand-400" />
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Turinio moderacija
        </h1>
      </div>

      {/* Status filter tabs */}
      <div className="mb-3 flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800 w-fit">
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

      {/* Type filter tabs */}
      <div className="mb-6 flex flex-wrap gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800 w-fit">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setTypeFilter(tab.value)}
            className={`rounded-lg px-3 py-1.5 text-body-sm font-medium transition-all ${
              typeFilter === tab.value
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
          <p className="text-body-sm text-surface-500">
            Nėra turinio pagal pasirinktą filtrą.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={`${item.type}-${item.id}`}
              className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default">{item.typeLabel}</Badge>
                    <Badge variant={statusVariant(item.moderationStatus)}>
                      {statusLabel(item.moderationStatus)}
                    </Badge>
                    <h3 className="font-semibold text-surface-900 dark:text-white truncate">
                      {item.title}
                    </h3>
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-surface-500">
                    <span>{item.submittedBy}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeDate(item.createdAt)}
                    </span>
                  </div>
                </div>

                {item.moderationStatus === "PENDING" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openAction(item, "approve")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-body-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Patvirtinti
                    </button>
                    <button
                      onClick={() => openAction(item, "reject")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-body-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                    >
                      <XCircle className="h-4 w-4" />
                      Atmesti
                    </button>
                  </div>
                )}
              </div>

              {/* Flagged text */}
              <div className="mt-3 max-h-36 overflow-y-auto whitespace-pre-wrap rounded-xl bg-surface-50 p-3 text-body-sm text-surface-700 dark:bg-surface-800/50 dark:text-surface-300">
                {item.excerpt}
              </div>

              {/* Why it was flagged */}
              {item.moderationReason && (
                <div className="mt-2 text-micro text-amber-700 dark:text-amber-400">
                  <span className="font-medium">Priežastis: </span>
                  {item.moderationReason}
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
            {Math.min(pagination.page * pagination.limit, pagination.total)} iš {pagination.total}
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

      {/* Action modal */}
      {actionItem && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-900">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">
              {actionType === "approve" ? "Patvirtinti turinį" : "Atmesti turinį"}
            </h2>
            <p className="mt-2 text-body-sm text-surface-500">
              {actionType === "approve"
                ? "Patvirtinus turinys taps matomas viešai."
                : "Atmestas turinys liks paslėptas. Priežastis (neprivaloma) bus išsaugota."}
            </p>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={
                actionType === "approve"
                  ? "Pastabos (neprivaloma)..."
                  : "Atmetimo priežastis..."
              }
              rows={3}
              className="mt-4 w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 dark:bg-surface-800 dark:text-surface-100 dark:border-surface-700 dark:placeholder:text-surface-500 resize-y"
            />
            {actionError && (
              <p className="mt-2 text-body-sm text-red-600 dark:text-red-400">{actionError}</p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeAction}
                disabled={actionLoading}
                className="rounded-xl px-4 py-2.5 text-body-sm font-medium text-surface-600 hover:bg-surface-100 transition-colors dark:text-surface-400 dark:hover:bg-surface-800"
              >
                Atšaukti
              </button>
              <button
                onClick={handleAction}
                disabled={actionLoading}
                className={`rounded-xl px-4 py-2.5 text-body-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                  actionType === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading
                  ? "Vykdoma..."
                  : actionType === "approve"
                    ? "Patvirtinti"
                    : "Atmesti"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
