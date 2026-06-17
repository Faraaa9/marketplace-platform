"use client";

import { useEffect, useState, useCallback, type FormEvent } from "react";
import Card from "@/components/ui/Card";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import {
  ANNOUNCEMENT_AUDIENCES,
  ANNOUNCEMENT_ICONS,
  AUDIENCE_LABELS,
  ICON_LABELS,
} from "@/lib/announcement-shared";

interface AnnouncementCard {
  id: string;
  title: string;
  body: string;
  ctaLabel: string | null;
  ctaHref: string | null;
  icon: string;
  audience: string;
  isActive: boolean;
  sortOrder: number;
  startsAt: string | null;
  endsAt: string | null;
}

interface Draft {
  title: string;
  body: string;
  audience: string;
  icon: string;
  ctaLabel: string;
  ctaHref: string;
  sortOrder: string;
  startsAt: string;
  endsAt: string;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  body: "",
  audience: "PROVIDER",
  icon: "lightbulb",
  ctaLabel: "",
  ctaHref: "",
  sortOrder: "0",
  startsAt: "",
  endsAt: "",
};

const inputCls =
  "rounded-lg border border-surface-200 bg-white px-3 py-2 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white";

function cardToDraft(c: AnnouncementCard): Draft {
  return {
    title: c.title,
    body: c.body,
    audience: c.audience,
    icon: c.icon,
    ctaLabel: c.ctaLabel ?? "",
    ctaHref: c.ctaHref ?? "",
    sortOrder: String(c.sortOrder),
    startsAt: c.startsAt ? c.startsAt.slice(0, 10) : "",
    endsAt: c.endsAt ? c.endsAt.slice(0, 10) : "",
  };
}

function draftToPayload(d: Draft) {
  return {
    title: d.title.trim(),
    body: d.body.trim(),
    audience: d.audience,
    icon: d.icon,
    ctaLabel: d.ctaLabel.trim(),
    ctaHref: d.ctaHref.trim(),
    sortOrder: parseInt(d.sortOrder, 10) || 0,
    startsAt: d.startsAt || null,
    endsAt: d.endsAt || null,
  };
}

function DraftFields({
  draft,
  onChange,
  idPrefix,
}: {
  draft: Draft;
  onChange: (field: keyof Draft, value: string) => void;
  idPrefix: string;
}) {
  return (
    <div className="grid gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-micro text-surface-400">Antraštė</span>
        <input
          value={draft.title}
          onChange={(e) => onChange("title", e.target.value)}
          placeholder="Greitas atsakymas laimi klientą"
          className={inputCls}
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-micro text-surface-400">Tekstas</span>
        <textarea
          value={draft.body}
          onChange={(e) => onChange("body", e.target.value)}
          rows={2}
          placeholder="Trumpas paaiškinimas, ką pranešti."
          className={`${inputCls} resize-y`}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Kam rodyti</span>
          <select
            value={draft.audience}
            onChange={(e) => onChange("audience", e.target.value)}
            className={`${inputCls} w-40`}
          >
            {ANNOUNCEMENT_AUDIENCES.map((a) => (
              <option key={a} value={a}>
                {AUDIENCE_LABELS[a]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Ikona</span>
          <select
            value={draft.icon}
            onChange={(e) => onChange("icon", e.target.value)}
            className={`${inputCls} w-40`}
          >
            {ANNOUNCEMENT_ICONS.map((i) => (
              <option key={i} value={i}>
                {ICON_LABELS[i]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Tvarka</span>
          <input
            type="number"
            value={draft.sortOrder}
            onChange={(e) => onChange("sortOrder", e.target.value)}
            className={`${inputCls} w-20`}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Mygtuko tekstas (nebūtina)</span>
          <input
            value={draft.ctaLabel}
            onChange={(e) => onChange("ctaLabel", e.target.value)}
            placeholder="Sužinoti daugiau"
            className={`${inputCls} w-52`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Mygtuko nuoroda (nebūtina)</span>
          <input
            value={draft.ctaHref}
            onChange={(e) => onChange("ctaHref", e.target.value)}
            placeholder="/tiekejas/planai"
            className={`${inputCls} w-52`}
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Rodyti nuo (nebūtina)</span>
          <input
            type="date"
            value={draft.startsAt}
            onChange={(e) => onChange("startsAt", e.target.value)}
            className={`${inputCls} w-44`}
            aria-label={`${idPrefix}-startsAt`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Rodyti iki (nebūtina)</span>
          <input
            type="date"
            value={draft.endsAt}
            onChange={(e) => onChange("endsAt", e.target.value)}
            className={`${inputCls} w-44`}
            aria-label={`${idPrefix}-endsAt`}
          />
        </label>
      </div>
    </div>
  );
}

export default function AnnouncementsCard() {
  const [cards, setCards] = useState<AnnouncementCard[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [newDraft, setNewDraft] = useState<Draft>(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/announcements");
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Nepavyko užkrauti");
        return;
      }
      const list: AnnouncementCard[] = data.data;
      setCards(list);
      const next: Record<string, Draft> = {};
      for (const c of list) next[c.id] = cardToDraft(c);
      setDrafts(next);
    } catch {
      setError("Nepavyko užkrauti");
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function editDraft(id: string, field: keyof Draft, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  async function saveRow(card: AnnouncementCard) {
    const d = drafts[card.id];
    if (!d) return;
    const payload = draftToPayload(d);
    if (!payload.title) {
      setError("Antraštė privaloma");
      return;
    }
    if (!payload.body) {
      setError("Tekstas privalomas");
      return;
    }
    setBusyId(card.id);
    setError("");
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, ...payload }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Nepavyko išsaugoti");
        return;
      }
      await load();
      setSavedId(card.id);
      setTimeout(() => setSavedId((cur) => (cur === card.id ? null : cur)), 2000);
    } catch {
      setError("Nepavyko išsaugoti");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(card: AnnouncementCard) {
    setBusyId(card.id);
    setError("");
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: card.id, isActive: !card.isActive }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Nepavyko išsaugoti");
        return;
      }
      await load();
    } catch {
      setError("Nepavyko išsaugoti");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    setBusyId(id);
    setError("");
    try {
      const res = await fetch(`/api/admin/announcements?id=${encodeURIComponent(id)}`, {
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
    const payload = draftToPayload(newDraft);
    if (!payload.title) {
      setError("Įveskite antraštę");
      return;
    }
    if (!payload.body) {
      setError("Įveskite tekstą");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, sortOrder: cards?.length ?? 0 }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Nepavyko sukurti");
        return;
      }
      setNewDraft(EMPTY_DRAFT);
      await load();
    } catch {
      setError("Nepavyko sukurti");
    } finally {
      setAdding(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
          <Megaphone className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <p className="text-body font-semibold text-surface-900 dark:text-white">
            Pranešimų kortelės
          </p>
          <p className="text-micro text-surface-500 dark:text-surface-400">
            Naujienos, patarimai ir akcijos, rodomi tiekėjų ir klientų skydeliuose. Vartotojas gali jas užverti.
          </p>
        </div>
      </div>

      {error && <p className="mt-3 text-micro text-red-500 dark:text-red-400">{error}</p>}

      <div className="mt-4 space-y-3">
        {cards === null ? (
          <p className="text-body-sm text-surface-400">Kraunama...</p>
        ) : cards.length === 0 ? (
          <p className="rounded-lg border border-dashed border-surface-200 px-3 py-2 text-micro text-surface-400 dark:border-surface-700">
            Kortelių dar nėra. Sukurkite pirmą žemiau.
          </p>
        ) : (
          cards.map((card) => {
            const d = drafts[card.id];
            if (!d) return null;
            return (
              <div
                key={card.id}
                className="rounded-xl border border-surface-200 p-3 dark:border-surface-700"
              >
                <DraftFields
                  draft={d}
                  idPrefix={card.id}
                  onChange={(field, value) => editDraft(card.id, field, value)}
                />
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-surface-100 pt-3 dark:border-surface-800">
                  <button
                    type="button"
                    onClick={() => toggleActive(card)}
                    disabled={busyId === card.id}
                    className={`rounded-lg px-3 py-2 text-caption font-medium transition-colors disabled:opacity-60 ${
                      card.isActive
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400"
                        : "bg-surface-100 text-surface-500 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-400"
                    }`}
                  >
                    {card.isActive ? "Matoma" : "Paslėpta"}
                  </button>
                  <div className="ml-auto flex items-center gap-2">
                    {savedId === card.id && (
                      <span className="text-micro text-emerald-600 dark:text-emerald-400">
                        Išsaugota
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => saveRow(card)}
                      disabled={busyId === card.id}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
                    >
                      Išsaugoti
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(card.id)}
                      disabled={busyId === card.id}
                      className="rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-100 hover:text-red-500 disabled:opacity-60 dark:hover:bg-surface-800"
                      aria-label={`Pašalinti kortelę ${card.title}`}
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
        className="mt-4 rounded-xl border border-dashed border-surface-200 p-3 dark:border-surface-700"
      >
        <p className="mb-3 text-body-sm font-semibold text-surface-900 dark:text-white">
          Nauja kortelė
        </p>
        <DraftFields
          draft={newDraft}
          idPrefix="new"
          onChange={(field, value) => setNewDraft((prev) => ({ ...prev, [field]: value }))}
        />
        <p className="mt-2 text-micro text-surface-400">
          Sukurta kortelė pradžioje yra paslėpta. Įjunkite „Matoma“, kai norėsite parodyti.
        </p>
        <button
          type="submit"
          disabled={adding}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          <Plus className="h-4 w-4" />
          Pridėti kortelę
        </button>
      </form>
    </Card>
  );
}
