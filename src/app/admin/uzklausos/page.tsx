"use client";

import { useEffect, useState, useCallback } from "react";
import { formatRelativeDate } from "@/lib/utils";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Trash2, ChevronLeft, ChevronRight, Search } from "lucide-react";

interface Request {
  id: string;
  title: string;
  categoryRef: { name: string } | null;
  /** All category names assigned (primary + secondary). */
  categoryNames?: string[];
  location: string;
  status: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
  _count: { responses: number };
}

interface CategoryOption {
  value: string;
  label: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  // Load the curated taxonomy for the category filter — the depth-1
  // categories users actually pick. Value is the slug the API filters by.
  useEffect(() => {
    fetch("/api/service-categories")
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) return;
        const options: CategoryOption[] = (
          data.data as Array<{
            categories: Array<{ slug: string; name: string }>;
          }>
        ).flatMap((group) =>
          group.categories.map((category) => ({
            value: category.slug,
            label: category.name,
          })),
        );
        setCategoryOptions(options);
      })
      .catch(() => setCategoryOptions([]));
  }, []);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    if (search) params.set("search", search);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/uzklausos?${params}`);
    const data = await res.json();
    if (data.success) {
      setRequests(data.data);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [statusFilter, categoryFilter, page, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [statusFilter, categoryFilter, search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRequests();
  }, [fetchRequests]);

  async function handleAction(id: string, action: string, status?: string) {
    if (action === "delete" && !confirm("Ar tikrai norite ištrinti?")) return;
    await fetch("/api/admin/uzklausos", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, status }),
    });
    fetchRequests();
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-6">Užklausos</h1>

      <div className="mb-4 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
        <input
          type="text"
          placeholder="Ieškoti pagal pavadinimą ar klientą..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-surface-300 bg-white pl-10 pr-4 py-2.5 text-body-sm ring-1 ring-transparent focus:border-brand-500 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Select
          options={[
            { value: "PENDING_CONFIRMATION", label: "Laukia patvirtinimo" },
            { value: "OPEN", label: "Atidarytos" },
            { value: "IN_PROGRESS", label: "Vykdomos" },
            { value: "CLOSED", label: "Uždarytos" },
          ]}
          placeholder="Visi statusai"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          options={categoryOptions}
          placeholder="Visos kategorijos"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="overflow-x-auto rounded-2xl border border-surface-200/60 dark:border-surface-700/50">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-surface-200/50 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50">
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Pavadinimas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Klientas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Kategorija</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Statusas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Atsakymai</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Data</th>
                <th className="text-right py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-900">
              {requests.map((req) => {
                const categoryNames =
                  req.categoryNames && req.categoryNames.length > 0
                    ? req.categoryNames
                    : req.categoryRef?.name
                      ? [req.categoryRef.name]
                      : [];
                return (
                  <tr key={req.id} className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-surface-900 dark:text-white max-w-[200px] truncate">{req.title}</td>
                    <td className="py-3 px-4 text-surface-500">{req.clientName}</td>
                    <td className="py-3 px-4">
                      {categoryNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {categoryNames.map((name, categoryIndex) => (
                            <Badge key={`${name}-${categoryIndex}`}>{name}</Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-surface-400">—</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={req.status}
                        onChange={(e) => handleAction(req.id, "updateStatus", e.target.value)}
                        className="rounded-xl border border-surface-300 bg-white px-2.5 py-1.5 text-micro font-medium focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
                      >
                        <option value="PENDING_CONFIRMATION">Laukia patvirtinimo</option>
                        <option value="OPEN">Atidaryta</option>
                        <option value="IN_PROGRESS">Vykdoma</option>
                        <option value="CLOSED">Uždaryta</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 text-surface-500">{req._count.responses}</td>
                    <td className="py-3 px-4 text-surface-500">{formatRelativeDate(req.createdAt)}</td>
                    <td className="py-3 px-4 text-right">
                      <button onClick={() => handleAction(req.id, "delete")} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors dark:hover:bg-surface-700">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
    </div>
  );
}
