"use client";

import { useEffect, useState, type FormEvent } from "react";
import Card from "@/components/ui/Card";
import { Coins, Plus, Trash2 } from "lucide-react";

interface Pack {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}

interface Draft {
  name: string;
  credits: string;
  price: string;
}

const inputCls =
  "rounded-lg border border-surface-200 bg-white px-3 py-2 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white";

export default function CreditPacksCard() {
  const [packs, setPacks] = useState<Pack[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCredits, setNewCredits] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [adding, setAdding] = useState(false);

  async function load() {
    try {
      const res = await fetch("/api/admin/packs");
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Nepavyko užkrauti paketų");
        return;
      }
      const list: Pack[] = data.data;
      setPacks(list);
      const next: Record<string, Draft> = {};
      for (const p of list) {
        next[p.id] = {
          name: p.name,
          credits: String(p.credits),
          price: (p.priceCents / 100).toFixed(2),
        };
      }
      setDrafts(next);
    } catch {
      setError("Nepavyko užkrauti paketų");
    }
  }

  useEffect(() => {
    load();
  }, []);

  function editDraft(id: string, field: keyof Draft, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function updatePack(
    id: string,
    patch: Partial<Pick<Pack, "name" | "credits" | "priceCents" | "isActive">>,
  ) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/admin/packs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...patch }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Nepavyko išsaugoti");
        return;
      }
      await load();
      setSavedId(id);
      setTimeout(() => setSavedId((cur) => (cur === id ? null : cur)), 2000);
    } catch {
      setError("Nepavyko išsaugoti");
    } finally {
      setBusyId(null);
    }
  }

  function saveRow(p: Pack) {
    const d = drafts[p.id];
    if (!d) return;
    const name = d.name.trim();
    const credits = parseInt(d.credits, 10);
    const priceCents = Math.round(parseFloat(d.price) * 100);
    if (!name) {
      setError("Pavadinimas privalomas");
      return;
    }
    if (!Number.isInteger(credits) || credits <= 0) {
      setError("Kreditų skaičius turi būti teigiamas");
      return;
    }
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError("Kaina turi būti teigiama");
      return;
    }
    updatePack(p.id, { name, credits, priceCents });
  }

  async function deletePack(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/packs?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Nepavyko pašalinti");
        return;
      }
      await load();
    } catch {
      setError("Nepavyko pašalinti");
    } finally {
      setBusyId(null);
    }
  }

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setError("");
    const name = newName.trim();
    const credits = parseInt(newCredits, 10);
    const priceCents = Math.round(parseFloat(newPrice) * 100);
    if (!name) {
      setError("Įveskite paketo pavadinimą");
      return;
    }
    if (!Number.isInteger(credits) || credits <= 0) {
      setError("Kreditų skaičius turi būti teigiamas");
      return;
    }
    if (!Number.isFinite(priceCents) || priceCents <= 0) {
      setError("Kaina turi būti teigiama");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/packs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, credits, priceCents, sortOrder: packs?.length ?? 0 }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Nepavyko sukurti paketo");
        return;
      }
      setNewName("");
      setNewCredits("");
      setNewPrice("");
      await load();
    } catch {
      setError("Nepavyko sukurti paketo");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
          <Coins className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <p className="text-body font-semibold text-surface-900 dark:text-white">
            Kreditų paketai
          </p>
          <p className="text-micro text-surface-500 dark:text-surface-400">
            Paketai, kuriuos tiekėjai gali pirkti. Kaina nurodoma eurais.
          </p>
        </div>
      </div>

      {error && <p className="mt-3 text-micro text-red-500 dark:text-red-400">{error}</p>}

      <div className="mt-4 space-y-2">
        {packs === null ? (
          <p className="text-body-sm text-surface-400">Kraunama...</p>
        ) : packs.length === 0 ? (
          <p className="rounded-lg border border-dashed border-surface-200 px-3 py-2 text-micro text-surface-400 dark:border-surface-700">
            Paketų nėra. Pridėkite bent vieną, kad tiekėjai galėtų pirkti kreditų.
          </p>
        ) : (
          packs.map((p) => {
            const d = drafts[p.id];
            if (!d) return null;
            return (
              <div
                key={p.id}
                className="rounded-xl border border-surface-200 p-3 dark:border-surface-700"
              >
                <div className="flex flex-wrap items-end gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-micro text-surface-400">Pavadinimas</span>
                    <input
                      value={d.name}
                      onChange={(e) => editDraft(p.id, "name", e.target.value)}
                      className={`${inputCls} w-44`}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-micro text-surface-400">Kreditai</span>
                    <input
                      type="number"
                      min="1"
                      value={d.credits}
                      onChange={(e) => editDraft(p.id, "credits", e.target.value)}
                      className={`${inputCls} w-24`}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-micro text-surface-400">Kaina, €</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={d.price}
                      onChange={(e) => editDraft(p.id, "price", e.target.value)}
                      className={`${inputCls} w-24`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => updatePack(p.id, { isActive: !p.isActive })}
                    disabled={busyId === p.id}
                    className={`rounded-lg px-3 py-2 text-caption font-medium transition-colors disabled:opacity-60 ${
                      p.isActive
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400"
                    }`}
                  >
                    {p.isActive ? "Matomas" : "Paslėptas"}
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    {savedId === p.id && (
                      <span className="text-micro text-emerald-600 dark:text-emerald-400">
                        Išsaugota
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => saveRow(p)}
                      disabled={busyId === p.id}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                    >
                      Išsaugoti
                    </button>
                    <button
                      type="button"
                      onClick={() => deletePack(p.id)}
                      disabled={busyId === p.id}
                      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-red-500 disabled:opacity-60 dark:hover:bg-surface-800"
                      aria-label={`Pašalinti paketą ${p.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <form
        onSubmit={handleAdd}
        className="mt-4 flex flex-wrap items-end gap-3 border-t border-surface-100 pt-4 dark:border-surface-800"
      >
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Naujas paketas</span>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Pavadinimas"
            className={`${inputCls} w-44`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Kreditai</span>
          <input
            type="number"
            min="1"
            value={newCredits}
            onChange={(e) => setNewCredits(e.target.value)}
            placeholder="10"
            className={`${inputCls} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Kaina, €</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={newPrice}
            onChange={(e) => setNewPrice(e.target.value)}
            placeholder="20.00"
            className={`${inputCls} w-24`}
          />
        </label>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Pridėti
        </button>
      </form>
    </Card>
  );
}
