"use client";

import { useState } from "react";
import {
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  CircleGauge,
  Loader2,
  MapPin,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";

interface CategoryResult {
  id: string;
  name: string;
  probability: number;
  selected: boolean;
  primary: boolean;
}

interface ProviderResult {
  id: string;
  name: string;
  semanticScore: number;
  confidence: number;
  compositeScore: number;
  cityMatch: boolean;
  rating: number | null;
  reviewCount: number;
}

interface LabResult {
  engine: "typesafe" | "demo";
  model: string;
  decision: "auto" | "review" | "reject";
  decisionReason: string;
  primaryCategoryName: string | null;
  primaryConfidence: number;
  categories: CategoryResult[];
  spamProbability: number;
  ambiguityProbability: number;
  urgencyProbability: number;
  missingDetailsProbability: number;
  providers: ProviderResult[];
  usage: { inputTokens: number; outputTokens: number } | null;
  latencyMs: number;
  fallbackReason?: "missing_key" | "api_error";
}

const EXAMPLES = [
  {
    label: "Santechnika",
    text: "Virtuvėje po kriaukle trūko vamzdis. Reikia skubiai pakeisti vamzdį ir patikrinti, ar nėra daugiau nuotėkių.",
    city: "Vilnius",
  },
  {
    label: "Elektrikas",
    text: "Naujame bute reikia sumontuoti šešis šviestuvus ir sutvarkyti dvi neveikiančias rozetes.",
    city: "Kaunas",
  },
  {
    label: "Neaiški",
    text: "Reikia sutvarkyti namą: elektrą, sienas, grindis ir galbūt stogą. Nežinau nuo ko pradėti.",
    city: "Klaipėda",
  },
  {
    label: "Šlamštas",
    text: "Pirkite pigiai dabar, geriausios nuolaidos, spauskite nuorodą ir uždirbkite greitai.",
    city: "",
  },
] as const;

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function MetricBar({ label, value, tone = "emerald" }: { label: string; value: number; tone?: "emerald" | "amber" | "rose" }) {
  const colors = {
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
  };
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-4 text-body-sm">
        <span className="text-surface-700 dark:text-surface-200">{label}</span>
        <span className="font-semibold tabular-nums text-surface-900 dark:text-white">{percent(value)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
        <div className={`h-full rounded-full ${colors[tone]}`} style={{ width: percent(value) }} />
      </div>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: LabResult["decision"] }) {
  const styles = {
    auto: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    review: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
    reject: "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300",
  };
  const labels = { auto: "Automatiškai", review: "Peržiūrėti", reject: "Atmesti" };
  const Icon = decision === "auto" ? CheckCircle2 : decision === "review" ? AlertTriangle : ShieldAlert;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-body-sm font-semibold ${styles[decision]}`}>
      <Icon className="h-4 w-4" /> {labels[decision]}
    </span>
  );
}

export default function TypeSafeLabPage() {
  const [text, setText] = useState<string>(EXAMPLES[0].text);
  const [city, setCity] = useState<string>(EXAMPLES[0].city);
  const [result, setResult] = useState<LabResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function evaluate() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/typesafe-lab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, city }),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Vertinimas nepavyko");
      setResult(payload.data);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Vertinimas nepavyko");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-12">
      <header className="flex flex-col gap-3 border-b border-surface-200 pb-5 dark:border-surface-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <BrainCircuit className="h-5 w-5" />
            <span className="text-body-sm font-semibold">TypeSafe System One</span>
          </div>
          <h1 className="text-heading-lg font-bold text-surface-950 dark:text-white">Jev laboratorija</h1>
          <p className="mt-1 max-w-2xl text-body text-surface-600 dark:text-surface-400">
            Patikrinkite kategoriją, šlamšto riziką, dviprasmiškumą ir tinkamiausius tiekėjus nekeičiant realių užklausų.
          </p>
        </div>
        {result && (
          <div className="text-right text-body-sm text-surface-500">
            <p>{result.model}</p>
            <p>{result.latencyMs} ms</p>
          </div>
        )}
      </header>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div className="space-y-4">
          <div>
            <label htmlFor="request-text" className="mb-2 block text-body-sm font-semibold text-surface-800 dark:text-surface-100">
              Kliento užklausa
            </label>
            <textarea
              id="request-text"
              value={text}
              onChange={(event) => setText(event.target.value)}
              rows={7}
              maxLength={4000}
              className="w-full resize-y rounded-lg border border-surface-300 bg-white px-3.5 py-3 text-body text-surface-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
            />
          </div>
          <div>
            <label htmlFor="request-city" className="mb-2 block text-body-sm font-semibold text-surface-800 dark:text-surface-100">
              Miestas
            </label>
            <div className="relative">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-surface-400" />
              <input
                id="request-city"
                value={city}
                onChange={(event) => setCity(event.target.value)}
                placeholder="Pvz., Vilnius"
                maxLength={120}
                className="w-full rounded-lg border border-surface-300 bg-white py-2.5 pl-10 pr-3 text-body text-surface-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={evaluate}
              disabled={loading || text.trim().length < 10}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-body-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Vertinama..." : "Vertinti su Jev"}
            </button>
            {EXAMPLES.map((example) => (
              <button
                key={example.label}
                type="button"
                onClick={() => {
                  setText(example.text);
                  setCity(example.city);
                  setResult(null);
                  setError(null);
                }}
                className="min-h-10 rounded-lg border border-surface-300 px-3 py-2 text-body-sm font-medium text-surface-700 transition hover:border-surface-400 hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
              >
                {example.label}
              </button>
            ))}
          </div>
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-body-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <aside className="border-l-0 border-surface-200 lg:border-l lg:pl-6 dark:border-surface-800">
          <h2 className="flex items-center gap-2 text-heading-sm font-semibold text-surface-900 dark:text-white">
            <CircleGauge className="h-5 w-5 text-surface-500" /> Sprendimo taisyklės
          </h2>
          <dl className="mt-4 space-y-3 text-body-sm">
            <div className="flex justify-between gap-4"><dt className="text-surface-600 dark:text-surface-400">Automatiškai</dt><dd className="font-medium text-surface-900 dark:text-white">≥ 78%</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-surface-600 dark:text-surface-400">Žmogaus peržiūra</dt><dd className="font-medium text-surface-900 dark:text-white">ribiniai atvejai</dd></div>
            <div className="flex justify-between gap-4"><dt className="text-surface-600 dark:text-surface-400">Atmesti</dt><dd className="font-medium text-surface-900 dark:text-white">šlamštas ≥ 85%</dd></div>
          </dl>
          <p className="mt-5 border-t border-surface-200 pt-4 text-body-sm leading-relaxed text-surface-500 dark:border-surface-800 dark:text-surface-400">
            Jev pateikia tik tikimybes. Galutinį veiksmą ir slenksčius valdo programos kodas.
          </p>
        </aside>
      </section>

      {result && (
        <section className="space-y-6 border-t border-surface-200 pt-6 dark:border-surface-800">
          {result.engine === "demo" && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-body-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Rodomas deterministinis atsarginis rezultatas, nes Jev API neatsakė. Tai nėra Jev vertinimas.
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-body-sm text-surface-500">Rekomenduojamas veiksmas</p>
              <p className="mt-1 font-semibold text-surface-900 dark:text-white">{result.decisionReason}</p>
            </div>
            <DecisionBadge decision={result.decision} />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-heading-sm font-semibold text-surface-900 dark:text-white">Kategorijų vertinimas</h2>
              {result.categories.length === 0 ? (
                <p className="text-body-sm text-surface-500">Kategorijų kandidatų nerasta.</p>
              ) : result.categories.map((category) => (
                <div key={category.id} className="rounded-lg border border-surface-200 p-3 dark:border-surface-800">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-body-sm font-semibold text-surface-900 dark:text-white">
                      {category.name}
                    </span>
                    <span className="shrink-0 text-body-sm font-semibold tabular-nums text-surface-700 dark:text-surface-200">
                      {percent(category.probability)}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-100 dark:bg-surface-800">
                    <div className={`h-full rounded-full ${category.selected ? "bg-emerald-500" : "bg-surface-400"}`} style={{ width: percent(category.probability) }} />
                  </div>
                  {(category.primary || category.selected) && (
                    <p className="mt-2 text-micro font-semibold text-emerald-700 dark:text-emerald-300">
                      {category.primary ? "Pagrindinė kategorija" : "Papildoma kategorija"}
                    </p>
                  )}
                </div>
              ))}
            </div>

            <div className="space-y-5">
              <h2 className="text-heading-sm font-semibold text-surface-900 dark:text-white">Rizikos signalai</h2>
              <MetricBar label="Pagrindinės kategorijos užtikrintumas" value={result.primaryConfidence} />
              <MetricBar label="Dviprasmiškumas" value={result.ambiguityProbability} tone="amber" />
              <MetricBar label="Šlamšto tikimybė" value={result.spamProbability} tone="rose" />
              <MetricBar label="Skubumas" value={result.urgencyProbability} tone="amber" />
              <MetricBar label="Trūksta detalių pasiūlymui" value={result.missingDetailsProbability} tone="amber" />
              {result.usage && (
                <p className="pt-2 text-micro text-surface-500">
                  Tokenai: {result.usage.inputTokens} įvesties, {result.usage.outputTokens} išvesties
                </p>
              )}
            </div>
          </div>

          <div>
            <h2 className="flex items-center gap-2 text-heading-sm font-semibold text-surface-900 dark:text-white">
              <Users className="h-5 w-5 text-surface-500" /> Tiekėjų reitingas
            </h2>
            {result.providers.length === 0 ? (
              <p className="mt-3 text-body-sm text-surface-500">Aktyvių tiekėjų pagal rastas kategorijas nėra.</p>
            ) : (
              <div className="mt-3 divide-y divide-surface-200 border-y border-surface-200 dark:divide-surface-800 dark:border-surface-800">
                {result.providers.map((provider, index) => (
                  <div key={provider.id} className="grid gap-2 py-3 sm:grid-cols-[2rem_minmax(0,1fr)_auto] sm:items-center">
                    <span className="text-body-sm font-semibold tabular-nums text-surface-400">{index + 1}</span>
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-surface-900 dark:text-white">{provider.name}</p>
                      <p className="text-micro text-surface-500">
                        Semantinis atitikimas {percent(provider.semanticScore)}
                        {provider.cityMatch ? " · miestas tinka" : ""}
                        {provider.rating != null ? ` · ★ ${provider.rating.toFixed(1)} (${provider.reviewCount})` : ""}
                      </p>
                    </div>
                    <span className="text-body-sm font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                      {percent(provider.compositeScore)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
