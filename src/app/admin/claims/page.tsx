"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Mail,
  Clock,
  Shield,
} from "lucide-react";

interface ClaimSupplier {
  id: string;
  displayName: string;
  slug: string;
  status: string;
  city: string | null;
  externalSourceUrl: string | null;
}

interface ClaimUser {
  id: string;
  name: string | null;
  email: string;
}

interface Claim {
  id: string;
  supplierRecordId: string;
  requestedByEmail: string;
  verificationMethod: string;
  status: string;
  expiresAt: string;
  emailVerifiedAt: string | null;
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  submittedEvidenceJson: string | null;
  createdAt: string;
  supplier: ClaimSupplier | null;
  requestedBy: ClaimUser | null;
  reviewedBy: ClaimUser | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS = [
  { value: "", label: "Visi" },
  { value: "pending", label: "Laukiantys" },
  { value: "approved", label: "Patvirtinti" },
  { value: "rejected", label: "Atmesti" },
  { value: "expired", label: "Pasibaigę" },
];

function statusVariant(status: string): "warning" | "success" | "danger" | "default" {
  switch (status) {
    case "pending": return "warning";
    case "approved": return "success";
    case "rejected": return "danger";
    default: return "default";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending": return "Laukia";
    case "approved": return "Patvirtintas";
    case "rejected": return "Atmestas";
    case "expired": return "Pasibaigęs";
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

export default function AdminClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Action state
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/claims?${params}`);
    const data = await res.json();
    if (data.success) {
      setClaims(data.data);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [statusFilter, page]);

  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  function openAction(claimId: string, type: "approve" | "reject") {
    setActionId(claimId);
    setActionType(type);
    setReviewNotes("");
    setActionError(null);
  }

  function closeAction() {
    setActionId(null);
    setActionType(null);
    setReviewNotes("");
    setActionError(null);
  }

  async function handleAction() {
    if (!actionId || !actionType) return;
    setActionLoading(true);
    setActionError(null);

    try {
      const res = await fetch(`/api/admin/claims/${actionId}/${actionType}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: reviewNotes || undefined }),
      });
      const data = await res.json();

      if (!data.success) {
        setActionError(data.error || "Veiksmas nepavyko");
        setActionLoading(false);
        return;
      }

      closeAction();
      fetchClaims();
    } catch {
      setActionError("Tinklo klaida");
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="h-6 w-6 text-brand-600 dark:text-brand-400" />
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Profilio perėmimai</h1>
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800 w-fit">
        {STATUS_OPTIONS.map((tab) => (
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
      ) : claims.length === 0 ? (
        <div className="rounded-2xl border border-surface-200/60 bg-white p-12 text-center dark:border-surface-700/50 dark:bg-surface-900">
          <p className="text-body-sm text-surface-500">Nėra prašymų pagal pasirinktą filtrą.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900"
            >
              {/* Header row */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-surface-900 dark:text-white truncate">
                      {claim.supplier?.displayName ?? "Nežinomas tiekėjas"}
                    </h3>
                    <Badge variant={statusVariant(claim.status)}>
                      {statusLabel(claim.status)}
                    </Badge>
                    {claim.emailVerifiedAt && (
                      <Badge variant="info">
                        <Mail className="mr-1 h-3 w-3" />
                        El. patvirtintas
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-micro text-surface-500">
                    <span>{claim.requestedByEmail}</span>
                    <span>{claim.verificationMethod === "email" ? "El. paštu" : "Rankiniu būdu"}</span>
                    {claim.supplier?.city && <span>{claim.supplier.city}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {relativeDate(claim.createdAt)}
                    </span>
                    {claim.supplier?.externalSourceUrl && (
                      <a
                        href={claim.supplier.externalSourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 dark:text-brand-400"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Šaltinis
                      </a>
                    )}
                  </div>
                </div>

                {/* Actions */}
                {claim.status === "pending" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openAction(claim.id, "approve")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-body-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Patvirtinti
                    </button>
                    <button
                      onClick={() => openAction(claim.id, "reject")}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2 text-body-sm font-medium text-red-700 transition-colors hover:bg-red-100 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20"
                    >
                      <XCircle className="h-4 w-4" />
                      Atmesti
                    </button>
                  </div>
                )}
              </div>

              {/* Evidence */}
              {claim.submittedEvidenceJson && (
                <div className="mt-3 rounded-xl bg-surface-50 p-3 text-body-sm text-surface-600 dark:bg-surface-800/50 dark:text-surface-400">
                  <span className="font-medium text-surface-700 dark:text-surface-300">Įrodymai: </span>
                  {claim.submittedEvidenceJson}
                </div>
              )}

              {/* Review info */}
              {claim.reviewedAt && (
                <div className="mt-2 text-micro text-surface-400">
                  Peržiūrėta {relativeDate(claim.reviewedAt)}
                  {claim.reviewedBy?.name && ` — ${claim.reviewedBy.name}`}
                  {claim.reviewNotes && ` — „${claim.reviewNotes}"`}
                </div>
              )}

              {/* Expiry warning */}
              {claim.status === "pending" && new Date(claim.expiresAt) < new Date() && (
                <div className="mt-2 text-micro font-medium text-amber-600 dark:text-amber-400">
                  ⚠ Prašymas pasibaigė, bet dar nepažymėtas kaip expired
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
            Rodoma {(pagination.page - 1) * pagination.limit + 1}–{Math.min(pagination.page * pagination.limit, pagination.total)} iš {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-xl border border-surface-300 p-2 text-surface-500 hover:bg-surface-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors dark:border-surface-600 dark:hover:bg-surface-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-body-sm text-surface-700 dark:text-surface-300">{page} / {pagination.totalPages}</span>
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

      {/* Action modal overlay */}
      {actionId && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-surface-900">
            <h2 className="text-lg font-bold text-surface-900 dark:text-white">
              {actionType === "approve" ? "Patvirtinti prašymą" : "Atmesti prašymą"}
            </h2>
            <p className="mt-2 text-body-sm text-surface-500">
              {actionType === "approve"
                ? "Patvirtinus bus sukurta tiekėjo tapatybė ir profilis bus pažymėtas kaip perimtas."
                : "Pateikite atmesto prašymo priežastį (neprivaloma). Ji bus išsiųsta el. paštu."}
            </p>
            <textarea
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder={actionType === "approve" ? "Pastabos (neprivaloma)..." : "Atmetimo priežastis..."}
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
