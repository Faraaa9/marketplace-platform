"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Sparkles,
  Loader2,
  Mic,
  CheckCircle2,
  Pencil,
  ArrowRight,
  Wand2,
  Plus,
  MapPin,
  Wallet,
  CalendarClock,
  Tag,
  AlertCircle,
} from "lucide-react";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import { cn } from "@/lib/utils";

export interface AiInferredFields {
  title: string;
  description: string;
  categorySlug: string;
  location: string;
  budget: string;
  deadline: string;
}

export interface AiRecommendation {
  prompt: string;
  field: string;
}

interface RequestAiAgentPanelProps {
  initialRawText?: string;
  /** Run the improve call immediately on mount (hero entry flow). */
  autoRunOnMount?: boolean;
  /** Slug → human label map; used to show the inferred category in plain text. */
  categoryLabelBySlug: Map<string, string>;
  onRawTextChange?: (value: string) => void;
  onApply: (fields: AiInferredFields) => void;
  /** Append a missing-info question line to the form description. */
  onAppendField: (field: string) => void;
  /** Fields the user has already added from recommendations. */
  alreadyAddedFields?: string[];
}

type PanelStatus =
  | "input"
  | "loading"
  | "preview"
  | "applied"
  | "error";

const MIN_TEXT_LENGTH = 15;
const MAX_TEXT_LENGTH = 2000;

export default function RequestAiAgentPanel({
  initialRawText = "",
  autoRunOnMount = false,
  categoryLabelBySlug,
  onRawTextChange,
  onApply,
  onAppendField,
  alreadyAddedFields = [],
}: RequestAiAgentPanelProps) {
  const [rawText, setRawText] = useState(initialRawText);
  const [status, setStatus] = useState<PanelStatus>(
    autoRunOnMount && initialRawText.trim().length >= MIN_TEXT_LENGTH
      ? "loading"
      : "input",
  );
  const [inferred, setInferred] = useState<
    (AiInferredFields & { recommendations: AiRecommendation[] }) | null
  >(null);
  const [error, setError] = useState<string | null>(null);
  const autoRanRef = useRef(false);

  useEffect(() => {
    onRawTextChange?.(rawText);
  }, [onRawTextChange, rawText]);

  const handleTranscript = useCallback((text: string) => {
    setRawText((prev) => {
      const base = prev.trimEnd();
      return (base ? `${base} ${text}` : text).slice(0, MAX_TEXT_LENGTH);
    });
  }, []);

  const {
    isSupported: micSupported,
    status: micStatus,
    error: micError,
    toggle: toggleMic,
  } = useVoiceRecorder({ onTranscript: handleTranscript });

  const runImprove = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length < MIN_TEXT_LENGTH) return;
      setStatus("loading");
      setError(null);
      try {
        const res = await fetch("/api/requests/improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: trimmed }),
        });
        const data = (await res.json().catch(() => null)) as
          | {
              success?: boolean;
              error?: string;
              data?: {
                improvedDescription?: string;
                title?: string;
                category?: string;
                location?: string;
                budget?: string;
                deadline?: string;
                recommendations?: AiRecommendation[];
              };
            }
          | null;
        if (!res.ok || !data?.success || !data.data?.improvedDescription) {
          setError(
            data?.error || "AI nepavyko apdoroti aprašymo. Pildyk laukus pats.",
          );
          setStatus("error");
          return;
        }
        const recs: AiRecommendation[] = Array.isArray(data.data.recommendations)
          ? data.data.recommendations
              .filter(
                (item): item is AiRecommendation =>
                  !!item &&
                  typeof item.prompt === "string" &&
                  typeof item.field === "string" &&
                  item.prompt.trim().length > 0 &&
                  item.field.trim().length > 0,
              )
              .slice(0, 3)
          : [];
        setInferred({
          title: data.data.title || "",
          description: data.data.improvedDescription,
          categorySlug: data.data.category || "",
          location: data.data.location || "",
          budget: data.data.budget || "",
          deadline: data.data.deadline || "",
          recommendations: recs,
        });
        setStatus("preview");
      } catch {
        setError("Tinklo klaida. Bandyk dar kartą.");
        setStatus("error");
      }
    },
    [],
  );

  // Auto-run once on mount when arriving from the hero with a description.
  // Deferred via microtask so the effect body doesn't trigger setState during
  // a render — the lint rule otherwise flags the synchronous call inside
  // `runImprove`.
  useEffect(() => {
    if (!autoRunOnMount || autoRanRef.current) return;
    if (initialRawText.trim().length < MIN_TEXT_LENGTH) return;
    autoRanRef.current = true;
    queueMicrotask(() => {
      void runImprove(initialRawText);
    });
  }, [autoRunOnMount, initialRawText, runImprove]);

  const canRun =
    rawText.trim().length >= MIN_TEXT_LENGTH && status !== "loading";

  function handleApply() {
    if (!inferred) return;
    onApply({
      title: inferred.title,
      description: inferred.description,
      categorySlug: inferred.categorySlug,
      location: inferred.location,
      budget: inferred.budget,
      deadline: inferred.deadline,
    });
    setStatus("applied");
  }

  function handleReopen() {
    setStatus(inferred ? "preview" : "input");
  }

  const remainingRecs =
    inferred?.recommendations.filter(
      (rec) => !alreadyAddedFields.includes(rec.field),
    ) ?? [];

  // ── Applied: compact "AI agentas paruošė" indicator ──
  if (status === "applied") {
    return (
      <section
        aria-label="Užklausos AI agentas"
        className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 px-5 py-4 dark:border-emerald-700/60 dark:bg-emerald-500/10"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="min-w-0">
              <p className="text-body-sm font-semibold text-emerald-800 dark:text-emerald-300">
                AI pasiūlymai pritaikyti
              </p>
              <p className="text-micro text-emerald-700/80 dark:text-emerald-300/80">
                Tikrink ir taisyk laukus žemiau — paskelbei tik tu.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleReopen}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 text-body-sm font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:border-emerald-700 dark:bg-surface-900 dark:text-emerald-300 dark:hover:bg-emerald-500/10"
          >
            <Pencil className="h-4 w-4" />
            Atverti AI agentą
          </button>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-label="Užklausos AI agentas"
      className="mt-6 rounded-2xl border border-surface-200/70 bg-white p-5 shadow-card dark:border-surface-700/60 dark:bg-surface-900/60 sm:p-6"
    >
      <header className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-300">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-body-sm font-semibold text-surface-900 dark:text-white">
            Užklausos AI agentas
          </h2>
          <p className="mt-0.5 text-micro text-surface-500 dark:text-surface-400">
            {status === "preview"
              ? "AI suprato tavo užklausą taip. Patikrink ir pritaikyk arba taisyk pats."
              : status === "loading"
                ? "Skaitau ir tvarkau tavo užklausą…"
                : "Aprašyk arba padiktuok, ko reikia. AI pasiūlys tvarkingą skelbimo versiją — pritaikysi tik tu."}
          </p>
        </div>
      </header>

      {/* ── Input area (always editable so user can re-run) ── */}
      <div className="mt-4">
        <label htmlFor="ai-agent-raw" className="sr-only">
          Aprašymas AI agentui
        </label>
        <div className="relative">
          <textarea
            id="ai-agent-raw"
            value={rawText}
            onChange={(e) => setRawText(e.target.value.slice(0, MAX_TEXT_LENGTH))}
            placeholder={
              micStatus === "recording"
                ? "Klausau, kalbėk..."
                : micStatus === "transcribing"
                  ? "Atpažįstu, ką pasakei..."
                  : "Pvz. Reikia patikimo santechniko vonios remontui Vilniuje. Biudžetas iki 800 €, pradėti norėčiau kitą savaitę."
            }
            rows={4}
            maxLength={MAX_TEXT_LENGTH}
            className="block w-full resize-y rounded-xl border border-surface-200 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200/60 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100 dark:placeholder:text-surface-500"
          />
          <p className="mt-1 text-right text-micro text-surface-400">
            {rawText.length}/{MAX_TEXT_LENGTH}
          </p>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          {micSupported && (
            <button
              type="button"
              onClick={toggleMic}
              disabled={micStatus === "transcribing"}
              aria-pressed={micStatus === "recording"}
              aria-label={
                micStatus === "recording"
                  ? "Stabdyti diktavimą"
                  : "Diktuoti aprašymą"
              }
              className={cn(
                "inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3.5 text-body-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                micStatus === "recording"
                  ? "border-red-300 bg-red-50 text-red-700 dark:border-red-700 dark:bg-red-500/10 dark:text-red-300"
                  : "border-surface-200 bg-white text-surface-700 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800",
              )}
            >
              {micStatus === "transcribing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {micStatus === "recording"
                ? "Stabdyti"
                : micStatus === "transcribing"
                  ? "Atpažįstama..."
                  : "Diktuoti"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void runImprove(rawText)}
            disabled={!canRun}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            {status === "loading" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            {status === "loading"
              ? "AI dirba..."
              : inferred
                ? "Perskaityk dar kartą"
                : "Sutvarkyk su AI"}
          </button>
        </div>

        {rawText.trim().length > 0 &&
          rawText.trim().length < MIN_TEXT_LENGTH && (
            <p className="mt-1.5 text-micro text-surface-500 dark:text-surface-400">
              Parašyk bent {MIN_TEXT_LENGTH} simbolių, kad AI galėtų suprasti
              užklausą.
            </p>
          )}

        {micError && (
          <p role="alert" className="mt-1.5 text-micro text-red-600 dark:text-red-400">
            {micError === "denied"
              ? "Mikrofonas užblokuotas. Leisk jį naršyklės nustatymuose."
              : micError === "unavailable"
                ? "Mikrofonas nepasiekiamas."
                : "Nepavyko atpažinti kalbos. Bandyk dar kartą."}
          </p>
        )}
      </div>

      {/* ── Loading skeleton ── */}
      {status === "loading" && !inferred && (
        <div className="mt-5 space-y-2">
          <div className="h-3 w-3/4 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
          <div className="h-3 w-full animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-surface-100 dark:bg-surface-800" />
        </div>
      )}

      {/* ── Error state ── */}
      {status === "error" && error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-body-sm text-amber-800 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── Inferred preview ── */}
      {inferred && (status === "preview" || status === "loading") && (
        <div className="mt-5 rounded-xl border border-surface-200/70 bg-surface-50/40 p-4 dark:border-surface-700/60 dark:bg-surface-950/40">
          <p className="text-micro font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
            AI suprato tavo užklausą taip
          </p>

          <dl className="mt-3 space-y-3">
            <PreviewRow label="Pavadinimas" value={inferred.title} />
            <PreviewRow
              label="Aprašymas"
              value={inferred.description}
              multiline
            />
            <PreviewRow
              label="Kategorija"
              icon={<Tag className="h-3.5 w-3.5" />}
              value={
                inferred.categorySlug
                  ? categoryLabelBySlug.get(inferred.categorySlug) ||
                    inferred.categorySlug
                  : ""
              }
              missingHint="Pasirink kategoriją pats apačioje"
            />
            <PreviewRow
              label="Miestas"
              icon={<MapPin className="h-3.5 w-3.5" />}
              value={inferred.location}
              missingHint="Nepaminėjai — pridėk apačioje"
            />
            <PreviewRow
              label="Biudžetas"
              icon={<Wallet className="h-3.5 w-3.5" />}
              value={inferred.budget}
              missingHint="Nepaminėjai — pridėk apačioje"
            />
            <PreviewRow
              label="Terminas"
              icon={<CalendarClock className="h-3.5 w-3.5" />}
              value={inferred.deadline}
              missingHint="Nepaminėjai — pridėk apačioje"
            />
          </dl>

          {remainingRecs.length > 0 && (
            <div className="mt-4 rounded-lg border border-brand-100 bg-brand-50/60 p-3 dark:border-brand-900/60 dark:bg-brand-950/30">
              <p className="text-micro font-semibold text-surface-700 dark:text-surface-200">
                AI dar nori patikslinti
              </p>
              <p className="mt-0.5 text-micro text-surface-500 dark:text-surface-400">
                Šie atsakymai padės tiekėjams tiksliau įkainoti.
              </p>
              <ul className="mt-2 space-y-1.5">
                {remainingRecs.map((rec) => (
                  <li key={rec.field}>
                    <button
                      type="button"
                      onClick={() => onAppendField(rec.field)}
                      className="flex min-h-11 w-full items-start gap-2 rounded-lg bg-white px-3 py-2 text-left text-body-sm text-surface-700 shadow-xs transition-colors hover:bg-surface-50 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
                    >
                      <Plus className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
                      <span>{rec.prompt}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-600 px-4 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
            >
              <ArrowRight className="h-4 w-4" />
              Pritaikyti formai
            </button>
            <p className="text-micro text-surface-500 dark:text-surface-400">
              Be tavo paspaudimo niekas neperrašys laukų.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

function PreviewRow({
  label,
  value,
  icon,
  multiline = false,
  missingHint,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
  multiline?: boolean;
  missingHint?: string;
}) {
  const trimmed = value.trim();
  return (
    <div className="grid grid-cols-[6.5rem_1fr] gap-3 text-body-sm">
      <dt className="flex items-center gap-1.5 pt-0.5 text-micro font-medium uppercase tracking-wide text-surface-500 dark:text-surface-400">
        {icon}
        {label}
      </dt>
      <dd
        className={cn(
          "min-w-0",
          trimmed
            ? "text-surface-800 dark:text-surface-100"
            : "text-surface-400 dark:text-surface-500",
          multiline ? "whitespace-pre-wrap" : "truncate",
        )}
      >
        {trimmed || missingHint || "—"}
      </dd>
    </div>
  );
}
