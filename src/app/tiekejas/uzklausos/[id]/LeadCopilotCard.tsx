"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MessageCircleQuestion,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LeadCopilotResult {
  fitSummary: string;
  fitReasons: string[];
  questions: string[];
  riskSignals: string[];
  nextStep: string;
  confidence: number | null;
}

interface LeadCopilotCardProps {
  requestId: string;
}

function confidenceLabel(confidence: number): string {
  if (confidence >= 0.75) return "Aukštas";
  if (confidence >= 0.5) return "Vidutinis";
  return "Ribotas";
}

function InsightList({
  icon,
  items,
  tone = "default",
}: {
  icon: ReactNode;
  items: string[];
  tone?: "default" | "warning";
}) {
  if (items.length === 0) return null;
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className="flex gap-2 text-body-sm text-surface-700 dark:text-surface-300">
          <span
            className={cn(
              "mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full",
              tone === "warning"
                ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
                : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300",
            )}
          >
            {icon}
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default function LeadCopilotCard({ requestId }: LeadCopilotCardProps) {
  const [result, setResult] = useState<LeadCopilotResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${requestId}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; data?: LeadCopilotResult }
        | null;

      if (!res.ok || !data?.success || !data.data) {
        setError(data?.error || "Nepavyko paruošti įžvalgos.");
        return;
      }

      setResult(data.data);
    } catch {
      setError("Nepavyko paruošti įžvalgos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mb-6 rounded-2xl border border-brand-100 bg-brand-50/40 p-5 dark:border-brand-900/60 dark:bg-brand-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-600 shadow-xs dark:bg-surface-900 dark:text-brand-300">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-body font-semibold text-surface-900 dark:text-white">
                AI lead įžvalga
              </h2>
              {result && (
                <p className="text-micro font-medium text-surface-500 dark:text-surface-400">
                  {result.confidence != null
                    ? `Tinkamumas: ${confidenceLabel(result.confidence)} (${Math.round(result.confidence * 100)}%)`
                    : "Tinkamumas: įvertis neprieinamas"}
                </p>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-brand-200 bg-white px-4 text-body-sm font-semibold text-brand-700 transition-colors hover:border-brand-300 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-brand-800 dark:bg-surface-900 dark:text-brand-300 dark:hover:bg-brand-950"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : result ? (
            <RefreshCw className="h-4 w-4" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {result ? "Atnaujinti" : "Įvertinti"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </p>
      )}

      {result ? (
        <div className="mt-5 space-y-5">
          <p className="text-body-sm font-medium text-surface-800 dark:text-surface-100">
            {result.fitSummary}
          </p>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <h3 className="mb-2 text-caption font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Atitikimo signalai
              </h3>
              <InsightList icon={<CheckCircle2 className="h-3.5 w-3.5" />} items={result.fitReasons} />
            </div>

            <div>
              <h3 className="mb-2 text-caption font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Klausimai klientui
              </h3>
              <InsightList icon={<MessageCircleQuestion className="h-3.5 w-3.5" />} items={result.questions} />
            </div>
          </div>

          {result.riskSignals.length > 0 && (
            <div>
              <h3 className="mb-2 text-caption font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
                Atsargumo signalai
              </h3>
              <InsightList
                icon={<AlertTriangle className="h-3.5 w-3.5" />}
                items={result.riskSignals}
                tone="warning"
              />
            </div>
          )}

          <div className="flex gap-2 rounded-xl border border-surface-200/60 bg-white/70 px-3 py-2.5 text-body-sm text-surface-700 dark:border-surface-700/60 dark:bg-surface-900/70 dark:text-surface-300">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
            <span>{result.nextStep}</span>
          </div>
        </div>
      ) : null}
    </section>
  );
}
