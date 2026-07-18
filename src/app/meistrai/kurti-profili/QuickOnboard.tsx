"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Search, X, Check, Loader2, MapPin, Phone, User, ArrowLeft } from "lucide-react";
import { LITHUANIAN_CITIES } from "@/lib/constants";

const AIProfileSetup = dynamic(
  () => import("@/app/kontaktai/AIProfileSetup").then((m) => m.AIProfileSetup),
  { ssr: false, loading: () => <p className="text-center text-gray-500 py-12">Kraunama…</p> },
);

type Trade = { id: string; name: string; group: string };

// ponytail: diacritic-fold substring match over trade NAMES. Covers the common
// trades (elektr-, santechn-, gips-). Alias recall (e.g. "santechnikas") is a
// known ceiling — add the /api/category-suggestions fallback if it shows up.
function fold(s: string): string {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();
}

const MAX_TRADES = 8;

export function QuickOnboard({ name }: { name: string }) {
  const router = useRouter();
  const [showAi, setShowAi] = useState(false);

  const [displayName, setDisplayName] = useState(name);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Trade[]>([]);
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/service-categories")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled || !json?.data) return;
        const flat: Trade[] = [];
        const seen = new Set<string>();
        // Walk all depths so specific trades (e.g. "Gipso kartono montavimas")
        // are searchable, not just the ~9 roots + depth-1.
        function walk(item: { id: string; name: string; children?: unknown[] }, group: string) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            flat.push({ id: item.id, name: item.name, group });
          }
          for (const c of (item.children ?? []) as typeof item[]) walk(c, group);
        }
        for (const g of json.data) walk(g.root, g.root.name);
        setTrades(flat);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const matches = useMemo(() => {
    const q = fold(query);
    if (q.length < 2) return [];
    const picked = new Set(selected.map((t) => t.id));
    return trades
      .filter((t) => !picked.has(t.id) && fold(t.name).includes(q))
      .slice(0, 8);
  }, [query, trades, selected]);

  function addTrade(t: Trade) {
    if (selected.length >= MAX_TRADES) return;
    setSelected((s) => [...s, t]);
    setQuery("");
    setError("");
  }
  function removeTrade(id: string) {
    setSelected((s) => s.filter((t) => t.id !== id));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (displayName.trim().length < 2) return setError("Įveskite vardą");
    if (selected.length === 0) return setError("Pasirinkite bent vieną sritį");
    if (city.trim().length === 0) return setError("Pasirinkite miestą");

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/tiekejas/profilis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          location: city.trim(),
          phone: phone.trim(),
          categoryIds: selected.map((t) => t.id),
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        setSubmitting(false);
        return setError(json?.error || "Nepavyko sukurti. Bandykite dar kartą.");
      }
      router.push(`/meistrai/${json.data.slug}`);
    } catch {
      setSubmitting(false);
      setError("Tinklo klaida. Bandykite dar kartą.");
    }
  }

  if (showAi) {
    return (
      <div className="max-w-2xl mx-auto px-4">
        <button
          type="button"
          onClick={() => setShowAi(false)}
          className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 mb-2"
        >
          <ArrowLeft className="w-4 h-4" /> Grįžti į greitą anketą
        </button>
        <AIProfileSetup />
      </div>
    );
  }

  const inputCls =
    "w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500";
  const labelCls = "flex items-center gap-1.5 text-sm font-medium mb-2 text-gray-700";

  return (
    <div className="max-w-md mx-auto px-4">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold mb-1">Sukurk profilį per minutę</h1>
        <p className="text-gray-600 text-sm">Keturi laukai — ir tave randa klientai.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1 — Vardas */}
        <div>
          <label htmlFor="qo-name" className={labelCls}>
            <User className="w-4 h-4" /> Vardas
          </label>
          <input
            id="qo-name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setError("");
            }}
            placeholder="Pvz. Tomas Kazlauskas"
            className={inputCls}
          />
        </div>

        {/* 2 — Ką dirbi */}
        <div>
          <label htmlFor="qo-trade" className={labelCls}>
            <Search className="w-4 h-4" /> Ką dirbi?
          </label>
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {selected.map((t) => (
                <span
                  key={t.id}
                  className="inline-flex items-center gap-1 rounded-full bg-orange-100 text-orange-800 text-sm pl-3 pr-1.5 py-1"
                >
                  {t.name}
                  <button
                    type="button"
                    onClick={() => removeTrade(t.id)}
                    aria-label={`Pašalinti ${t.name}`}
                    className="rounded-full p-0.5 hover:bg-orange-200"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input
            id="qo-trade"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rašyk: elektr, santechn, gips…"
            autoComplete="off"
            className={inputCls}
            disabled={selected.length >= MAX_TRADES}
          />
          {matches.length > 0 && (
            <ul className="mt-1.5 rounded-lg border border-gray-200 divide-y divide-gray-100 overflow-hidden">
              {matches.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => addTrade(t)}
                    className="w-full text-left px-4 py-2.5 hover:bg-orange-50 flex items-center justify-between gap-2"
                  >
                    <span className="text-gray-900">{t.name}</span>
                    {t.group !== t.name && (
                      <span className="text-xs text-gray-400 shrink-0">{t.group}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selected.length > 0 && (
            <p className="mt-1.5 text-xs text-gray-500">
              <Check className="inline w-3.5 h-3.5 text-green-600" /> Gausi visų šių sričių užklausas.
            </p>
          )}
        </div>

        {/* 3 — Miestas */}
        <div>
          <label htmlFor="qo-city" className={labelCls}>
            <MapPin className="w-4 h-4" /> Kur dirbi?
          </label>
          <input
            id="qo-city"
            type="text"
            list="qo-cities"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              setError("");
            }}
            placeholder="Pvz. Vilnius"
            autoComplete="off"
            className={inputCls}
          />
          <datalist id="qo-cities">
            {LITHUANIAN_CITIES.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        {/* 4 — Telefonas */}
        <div>
          <label htmlFor="qo-phone" className={labelCls}>
            <Phone className="w-4 h-4" /> Telefonas <span className="text-gray-400 font-normal">(neprivaloma)</span>
          </label>
          <input
            id="qo-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+370…"
            className={inputCls}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-3 text-white font-medium hover:bg-orange-700 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          {submitting ? "Kuriama…" : "Sukurti profilį"}
        </button>
      </form>

      <p className="text-center text-sm text-gray-500 mt-5">
        Turi paslaugos.lt profilį arba svetainę?{" "}
        <button
          type="button"
          onClick={() => setShowAi(true)}
          className="text-orange-600 font-medium hover:underline"
        >
          Užpildyk automatiškai
        </button>
      </p>
    </div>
  );
}
