"use client";

import { useEffect, useState, useCallback } from "react";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import { Search, Eye, Ban, CheckCircle, Trash2, ChevronLeft, ChevronRight } from "lucide-react";

const ROLES = ["CLIENT", "PROVIDER", "ADMIN"] as const;
type Role = (typeof ROLES)[number];

interface AdminUser {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  blocked: boolean;
  blockedAt: string | null;
  adminNote: string | null;
  phone: string | null;
  emailVerified: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const ROLE_LABELS: Record<Role, string> = {
  CLIENT: "Klientas",
  PROVIDER: "Tiekėjas",
  ADMIN: "Administratorius",
};

const ROLE_VARIANT: Record<Role, "default" | "info" | "brand"> = {
  CLIENT: "default",
  PROVIDER: "info",
  ADMIN: "brand",
};

function fmtDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("lt-LT");
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);
    params.set("page", String(page));
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    if (data.success) {
      setUsers(data.data);
      setPagination(data.pagination);
    }
    setLoading(false);
  }, [search, roleFilter, statusFilter, page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [search, roleFilter, statusFilter, page, fetchUsers]);

  async function patch(body: Record<string, unknown>) {
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  async function handleBlockToggle(u: AdminUser) {
    await patch({ userId: u.id, action: u.blocked ? "unblock" : "block" });
    setSelected(null);
    fetchUsers();
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Ar tikrai visiškai ištrinti ${u.email}? Veiksmas negrįžtamas.`)) return;
    await patch({ userId: u.id, action: "delete" });
    setSelected(null);
    fetchUsers();
  }

  async function handleRoleChange(u: AdminUser, role: Role) {
    if (role === u.role) return;
    await patch({ userId: u.id, action: "change-role", role });
    setSelected((prev) => (prev ? { ...prev, role } : prev));
    fetchUsers();
  }

  async function handleSaveNote() {
    if (!selected) return;
    setSavingNote(true);
    try {
      await patch({ userId: selected.id, action: "set-note", note: noteDraft });
      setSelected((prev) => (prev ? { ...prev, adminNote: noteDraft.trim() || null } : prev));
      fetchUsers();
    } finally {
      setSavingNote(false);
    }
  }

  function openModal(u: AdminUser) {
    setSelected(u);
    setNoteDraft(u.adminNote || "");
  }

  return (
    <div className="p-6 lg:p-8">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-6">Naudotojai</h1>

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
            { value: "", label: "Visos rolės" },
            { value: "CLIENT", label: "Klientai" },
            { value: "PROVIDER", label: "Tiekėjai" },
            { value: "ADMIN", label: "Adminai" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setRoleFilter(tab.value)}
              className={`rounded-lg px-3 py-1.5 text-body-sm font-medium transition-all ${
                roleFilter === tab.value
                  ? "bg-white text-surface-900 shadow-sm dark:bg-surface-700 dark:text-white"
                  : "text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-xl bg-surface-100 p-1 dark:bg-surface-800 shrink-0">
          {[
            { value: "", label: "Visi" },
            { value: "active", label: "Aktyvūs" },
            { value: "blocked", label: "Užblokuoti" },
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

      {loading ? (
        <LoadingSpinner />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-surface-200/60 dark:border-surface-700/50">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-surface-200/50 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50">
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Vardas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">El. paštas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Rolė</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Statusas</th>
                <th className="text-left py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Registracija</th>
                <th className="text-right py-3 px-4 font-medium text-surface-500 text-micro uppercase tracking-wider">Veiksmai</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-900">
              {users.map((u) => (
                <tr key={u.id} className="border-b border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/50 transition-colors">
                  <td className="py-3 px-4 font-medium text-surface-900 dark:text-white">
                    <span className="inline-flex items-center gap-1.5">
                      {u.name || "—"}
                      {u.adminNote && <span title="Yra admin pastaba" className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-surface-500">{u.email}</td>
                  <td className="py-3 px-4">
                    <Badge variant={ROLE_VARIANT[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge variant={u.blocked ? "danger" : "success"}>{u.blocked ? "Užblokuotas" : "Aktyvus"}</Badge>
                  </td>
                  <td className="py-3 px-4 text-surface-500">{fmtDate(u.createdAt)}</td>
                  <td className="py-3 px-4">
                    <div className="flex justify-end gap-1">
                      <button onClick={() => openModal(u)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors dark:hover:bg-surface-700">
                        <Eye className="h-4 w-4 text-surface-500" />
                      </button>
                      <button onClick={() => handleBlockToggle(u)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors dark:hover:bg-surface-700">
                        {u.blocked ? <CheckCircle className="h-4 w-4 text-emerald-500" /> : <Ban className="h-4 w-4 text-amber-500" />}
                      </button>
                      <button onClick={() => handleDelete(u)} className="p-1.5 hover:bg-surface-100 rounded-lg transition-colors dark:hover:bg-surface-700">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-surface-400">Naudotojų nerasta</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

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

      <Modal isOpen={!!selected} onClose={() => setSelected(null)} title={selected?.name || selected?.email || ""}>
        {selected && (
          <div className="space-y-3 text-body-sm">
            <p><strong className="text-surface-900 dark:text-white">El. paštas:</strong> <span className="text-surface-500">{selected.email}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Telefonas:</strong> <span className="text-surface-500">{selected.phone || "—"}</span></p>
            <p><strong className="text-surface-900 dark:text-white">El. paštas patvirtintas:</strong> <span className="text-surface-500">{selected.emailVerified ? "Taip" : "Ne"}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Registracija:</strong> <span className="text-surface-500">{fmtDate(selected.createdAt)}</span></p>
            <p><strong className="text-surface-900 dark:text-white">Paskutinį kartą matytas:</strong> <span className="text-surface-500">{fmtDate(selected.lastSeenAt)}</span></p>

            <div className="pt-3 border-t border-surface-100 dark:border-surface-800">
              <p className="font-medium text-surface-900 dark:text-white mb-2">Rolė</p>
              <div className="flex gap-2">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRoleChange(selected, r)}
                    className={`rounded-xl border px-3 py-1.5 text-body-sm transition-colors ${
                      selected.role === r
                        ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
                        : "border-surface-300 bg-white text-surface-700 hover:bg-surface-50 dark:border-surface-600 dark:bg-surface-800 dark:text-surface-300"
                    }`}
                  >
                    {ROLE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 border-t border-surface-100 dark:border-surface-800">
              <p className="font-medium text-surface-900 dark:text-white mb-1.5">Admin pastaba</p>
              <textarea
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                rows={3}
                placeholder="Vidinė pastaba apie šį naudotoją..."
                className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-body-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-surface-600 dark:bg-surface-800 dark:text-white"
              />
              <div className="mt-2 flex justify-end">
                <Button size="sm" onClick={handleSaveNote} isLoading={savingNote} disabled={noteDraft === (selected.adminNote || "")}>
                  Išsaugoti pastabą
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t border-surface-100 dark:border-surface-800 flex gap-2">
              <Button
                variant={selected.blocked ? "secondary" : "outline"}
                size="sm"
                onClick={() => handleBlockToggle(selected)}
                className="flex-1"
              >
                {selected.blocked ? "Atblokuoti" : "Užblokuoti"}
              </Button>
              <Button variant="danger" size="sm" onClick={() => handleDelete(selected)} className="flex-1">
                Ištrinti
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
