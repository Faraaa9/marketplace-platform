"use client";

import { useEffect, useState } from "react";
import { SERVICE_CATEGORIES } from "@/lib/constants";
import { formatRelativeDate } from "@/lib/utils";
import Select from "@/components/ui/Select";
import Badge from "@/components/ui/Badge";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Trash2 } from "lucide-react";

interface Request {
  id: string;
  title: string;
  category: string;
  location: string;
  status: string;
  clientName: string;
  clientEmail: string;
  createdAt: string;
  _count: { responses: number };
}

export default function AdminRequestsPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  useEffect(() => { fetchRequests(); }, [statusFilter, categoryFilter]);

  async function fetchRequests() {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/admin/uzklausos?${params}`);
    const data = await res.json();
    if (data.success) setRequests(data.data);
    setLoading(false);
  }

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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <Select
          options={[
            { value: "OPEN", label: "Atidarytos" },
            { value: "IN_PROGRESS", label: "Vykdomos" },
            { value: "CLOSED", label: "Uždarytos" },
          ]}
          placeholder="Visi statusai"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        />
        <Select
          options={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
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
                const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === req.category)?.label;
                return (
                  <tr key={req.id} className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-surface-900 dark:text-white max-w-[200px] truncate">{req.title}</td>
                    <td className="py-3 px-4 text-surface-500">{req.clientName}</td>
                    <td className="py-3 px-4"><Badge>{categoryLabel}</Badge></td>
                    <td className="py-3 px-4">
                      <select
                        value={req.status}
                        onChange={(e) => handleAction(req.id, "updateStatus", e.target.value)}
                        className="rounded-xl border border-surface-300 bg-white px-2.5 py-1.5 text-micro font-medium focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
                      >
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
    </div>
  );
}
