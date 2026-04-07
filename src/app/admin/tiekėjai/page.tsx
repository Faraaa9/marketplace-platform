"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Search, CheckCircle, XCircle, Trash2, Eye } from "lucide-react";

interface Provider {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  providerProfile: {
    isActive: boolean;
    planType: string;
    description?: string;
    location?: string;
    specializations: string[];
  } | null;
  _count: { responses: number };
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);

  useEffect(() => { fetchProviders(); }, [search]);

  async function fetchProviders() {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const res = await fetch(`/api/admin/tiekėjai?${params}`);
    const data = await res.json();
    if (data.success) setProviders(data.data);
    setLoading(false);
  }

  async function handleAction(userId: string, action: string) {
    if (action === "delete" && !confirm("Ar tikrai norite ištrinti šį tiekėją?")) return;
    await fetch("/api/admin/tiekėjai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });
    fetchProviders();
    setSelectedProvider(null);
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-6">Tiekėjai</h1>

      <div className="mb-6 relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
        <input
          type="text"
          placeholder="Ieškoti pagal vardą ar el. paštą..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-surface-300 bg-white pl-10 pr-4 py-2.5 text-body-sm ring-1 ring-transparent focus:border-brand-500 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
        />
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="overflow-x-auto rounded-2xl border border-surface-200/60 dark:border-surface-700/50">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-surface-200/50 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50">
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Vardas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">El. paštas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Planas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Statusas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Atsakymai</th>
                <th className="text-right py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-900">
              {providers.map((p) => (
                <tr key={p.id} className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-surface-900 dark:text-white">{p.name}</td>
                  <td className="py-3 px-4 text-surface-500">{p.email}</td>
                  <td className="py-3 px-4">
                    <Badge variant={p.providerProfile?.planType === "PRO" ? "brand" : p.providerProfile?.planType === "BASIC" ? "success" : "default"}>
                      {p.providerProfile?.planType || "FREE"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={p.providerProfile?.isActive ? "success" : "warning"}>
                      {p.providerProfile?.isActive ? "Aktyvus" : "Neaktyvus"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-surface-500">{p._count.responses}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => setSelectedProvider(p)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors dark:hover:bg-surface-700">
                        <Eye className="h-4 w-4 text-surface-500" />
                      </button>
                      {p.providerProfile?.isActive ? (
                        <button onClick={() => handleAction(p.id, "deactivate")} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors dark:hover:bg-surface-700">
                          <XCircle className="h-4 w-4 text-amber-500" />
                        </button>
                      ) : (
                        <button onClick={() => handleAction(p.id, "activate")} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors dark:hover:bg-surface-700">
                          <CheckCircle className="h-4 w-4 text-emerald-500" />
                        </button>
                      )}
                      <button onClick={() => handleAction(p.id, "delete")} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors dark:hover:bg-surface-700">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={!!selectedProvider} onClose={() => setSelectedProvider(null)} title={selectedProvider?.name || ""}>
        {selectedProvider?.providerProfile && (
          <div className="space-y-3 text-body-sm">
            <p><strong className="text-surface-900 dark:text-white">El. paštas:</strong> <span className="text-surface-500">{selectedProvider.email}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Vietovė:</strong> <span className="text-surface-500">{selectedProvider.providerProfile.location || "—"}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Specializacijos:</strong> <span className="text-surface-500">{selectedProvider.providerProfile.specializations.join(", ") || "—"}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Aprašymas:</strong> <span className="text-surface-500">{selectedProvider.providerProfile.description || "—"}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Planas:</strong> <span className="text-surface-500">{selectedProvider.providerProfile.planType}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Atsakymų:</strong> <span className="text-surface-500">{selectedProvider._count.responses}</span></p>
          </div>
        )}
      </Modal>
    </div>
  );
}
