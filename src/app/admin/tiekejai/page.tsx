"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { Search, CheckCircle, XCircle, Trash2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import GrantCreditsByEmailCard from "./GrantCreditsByEmailCard";

interface Provider {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  providerProfile: {
    isActive: boolean;
    isVerified: boolean;
    isPremium: boolean;
    isYoungTalent: boolean;
    isGoat: boolean;
    creditBalance: number;
    description?: string;
    location?: string;
    categories?: { category: { name: string } }[];
  } | null;
  _count: { responses: number };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [giftAmount, setGiftAmount] = useState("");
  const [gifting, setGifting] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/tiekejai?${params}`);
    const data = await res.json();
    if (data.success) {
      setProviders(data.data);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [search, statusFilter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchProviders();
  }, [search, statusFilter, page, fetchProviders]);

  async function handleAction(userId: string, action: string) {
    if (action === "delete" && !confirm("Ar tikrai norite ištrinti šį tiekėją?")) return;
    await fetch("/api/admin/tiekejai", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action }),
    });

    // Badge toggles stay in the open modal so the admin sees the change immediately;
    // every other action returns the admin to the list.
    const BADGE_ACTION_DELTAS: Record<string, Partial<NonNullable<Provider["providerProfile"]>>> = {
      verify: { isVerified: true },
      unverify: { isVerified: false },
      premium: { isPremium: true },
      unpremium: { isPremium: false },
      "young-talent": { isYoungTalent: true },
      "unyoung-talent": { isYoungTalent: false },
      goat: { isGoat: true },
      ungoat: { isGoat: false },
    };
    if (action in BADGE_ACTION_DELTAS) {
      const delta = BADGE_ACTION_DELTAS[action];
      setSelectedProvider((prev) =>
        prev && prev.providerProfile
          ? { ...prev, providerProfile: { ...prev.providerProfile, ...delta } }
          : prev,
      );
    } else {
      setSelectedProvider(null);
    }
    fetchProviders();
  }

  async function handleGiftCredits() {
    if (!selectedProvider) return;
    const amount = parseInt(giftAmount, 10);
    if (!Number.isInteger(amount) || amount <= 0) return;
    setGifting(true);
    try {
      await fetch("/api/admin/tiekejai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedProvider.id, action: "grant-credits", credits: amount }),
      });
      await fetchProviders();
      setSelectedProvider(null);
    } finally {
      setGifting(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-6">Tiekėjai</h1>

      <div className="mb-6">
        <GrantCreditsByEmailCard onGranted={fetchProviders} />
      </div>

      <div className="mb-6 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400" />
          <input
            type="text"
            placeholder="Ieškoti pagal vardą ar el. paštą..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-surface-300 bg-white pl-10 pr-4 py-2.5 text-body-sm ring-1 ring-transparent focus:border-brand-500 focus:ring-brand-500 focus:outline-none transition-all dark:border-surface-600 dark:bg-surface-800 dark:text-white"
          />
        </div>
        <div className="flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800 shrink-0">
          {[
            { value: "", label: "Visi" },
            { value: "active", label: "Aktyvūs" },
            { value: "inactive", label: "Neaktyvūs" },
          ].map((tab) => (
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
      </div>

      {loading ? <LoadingSpinner /> : (
        <div className="overflow-x-auto rounded-2xl border border-surface-200/60 dark:border-surface-700/50">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-surface-200/50 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50">
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Vardas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">El. paštas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Kreditai</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Statusas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Atsakymai</th>
                <th className="text-right py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-900">
              {providers.map((p) => (
                <tr key={p.id} className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-surface-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      {p.name}
                      {p.providerProfile?.isVerified && <VerifiedBadge tier="verified" size="sm" tooltipPlacement="bottom" />}
                      {p.providerProfile?.isYoungTalent && <VerifiedBadge tier="young-talent" size="sm" tooltipPlacement="bottom" />}
                      {p.providerProfile?.isPremium && <VerifiedBadge tier="premium" size="sm" tooltipPlacement="bottom" />}
                      {p.providerProfile?.isGoat && <VerifiedBadge tier="goat" size="sm" tooltipPlacement="bottom" />}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-surface-500">{p.email}</td>
                  <td className="py-3 px-4 font-medium tabular-nums text-surface-700 dark:text-surface-300">
                    {p.providerProfile?.creditBalance ?? 0}
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={p.providerProfile?.isActive ? "success" : "warning"}>
                      {p.providerProfile?.isActive ? "Aktyvus" : "Neaktyvus"}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-surface-500">{p._count.responses}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => { setSelectedProvider(p); setGiftAmount(""); }} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors dark:hover:bg-surface-700">
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

      <Modal isOpen={!!selectedProvider} onClose={() => setSelectedProvider(null)} title={selectedProvider?.name || ""}>
        {selectedProvider?.providerProfile && (
          <div className="space-y-3 text-body-sm">
            <p><strong className="text-surface-900 dark:text-white">El. paštas:</strong> <span className="text-surface-500">{selectedProvider.email}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Vietovė:</strong> <span className="text-surface-500">{selectedProvider.providerProfile.location || "—"}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Kategorijos:</strong> <span className="text-surface-500">{selectedProvider.providerProfile.categories?.map((c) => c.category.name).join(", ") || "—"}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Aprašymas:</strong> <span className="text-surface-500">{selectedProvider.providerProfile.description || "—"}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Atsakymų:</strong> <span className="text-surface-500">{selectedProvider._count.responses}</span></p>

            <div className="pt-2 border-t border-surface-100 dark:border-surface-800">
              <p className="font-medium text-surface-900 dark:text-white mb-2">Ženkliukai</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {(
                  [
                    {
                      tier: "verified" as const,
                      onLabel: "Patvirtintas",
                      offLabel: "Patvirtinti",
                      isOn: selectedProvider.providerProfile?.isVerified ?? false,
                      onAction: "verify",
                      offAction: "unverify",
                      onCls: "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:border-blue-500/40 dark:bg-blue-500/10 dark:text-blue-300",
                    },
                    {
                      tier: "young-talent" as const,
                      onLabel: "Jaunasis talentas",
                      offLabel: "Jaunasis talentas",
                      isOn: selectedProvider.providerProfile?.isYoungTalent ?? false,
                      onAction: "young-talent",
                      offAction: "unyoung-talent",
                      onCls: "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/40 dark:bg-emerald-500/10 dark:text-emerald-300",
                    },
                    {
                      tier: "premium" as const,
                      onLabel: "Aukso meistras",
                      offLabel: "Aukso meistras",
                      isOn: selectedProvider.providerProfile?.isPremium ?? false,
                      onAction: "premium",
                      offAction: "unpremium",
                      onCls: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-300",
                    },
                    {
                      tier: "goat" as const,
                      onLabel: "GOAT",
                      offLabel: "GOAT",
                      isOn: selectedProvider.providerProfile?.isGoat ?? false,
                      onAction: "goat",
                      offAction: "ungoat",
                      onCls: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 dark:border-violet-500/40 dark:bg-violet-500/10 dark:text-violet-300",
                    },
                  ]
                ).map((b) => (
                  <button
                    key={b.tier}
                    onClick={() => handleAction(selectedProvider.id, b.isOn ? b.offAction : b.onAction)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-body-sm transition-colors ${
                      b.isOn
                        ? b.onCls
                        : "border-surface-300 bg-white text-surface-700 hover:bg-surface-50 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300"
                    }`}
                  >
                    <VerifiedBadge tier={b.tier} size="sm" />
                    {b.isOn ? b.onLabel : b.offLabel}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-surface-100 dark:border-surface-800">
              <p className="font-medium text-surface-900 dark:text-white mb-1.5">
                Kreditų balansas: {selectedProvider.providerProfile.creditBalance}
              </p>
              <label className="block text-micro text-surface-500 mb-1.5">Dovanoti kreditų</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  min="1"
                  value={giftAmount}
                  onChange={(e) => setGiftAmount(e.target.value)}
                  placeholder="Pvz. 5"
                  className="w-32 rounded-xl border border-surface-300 bg-white px-3 py-2 text-body-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-white"
                />
                <Button
                  onClick={handleGiftCredits}
                  isLoading={gifting}
                  disabled={!giftAmount}
                  className="shrink-0"
                >
                  Dovanoti
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
