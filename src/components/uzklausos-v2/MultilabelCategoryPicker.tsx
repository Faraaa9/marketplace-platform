"use client";

import { useState } from "react";

// Phase A UX=C: per-job grey suggestion chips; the user taps to confirm. The
// system NEVER auto-activates a chip. Self-contained: fires accept/reject/manual
// events to the logging endpoint (best-effort) and tells the parent which
// category id to add/remove via onToggle.

export interface MlSuggestion {
  categoryId: string;
  slug: string;
  name: string;
  confidence?: number; // v2 only
  auto?: boolean; // v2 only: pre-selected by the parent on load
}
export interface MlJob {
  phrase: string;
  suggestions: MlSuggestion[];
  more: MlSuggestion[];
}

interface Props {
  jobs: MlJob[];
  /** form's currently-selected category ids (for the active/checked state) */
  selectedIds: string[];
  /** add or remove a category from the request */
  onToggle: (categoryId: string) => void;
  /** open the manual category picker for a gap ("+ dar viena") */
  onAddManual: () => void;
}

function logEvents(events: unknown[]) {
  // best-effort; never blocks or throws
  void fetch("/api/category-multilabel/log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  }).catch(() => {});
}

export default function MultilabelCategoryPicker({ jobs, selectedIds, onToggle, onAddManual }: Props) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const selected = new Set(selectedIds);

  function tap(job: MlJob, s: MlSuggestion, rank: number) {
    const wasOn = selected.has(s.categoryId);
    onToggle(s.categoryId);
    logEvents([
      {
        jobPhrase: job.phrase,
        suggestedCategoryId: s.categoryId,
        suggestedRank: rank,
        action: wasOn ? "rejected" : "accepted",
        chosenCategoryId: s.categoryId,
      },
    ]);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.7rem] text-surface-400">
        Pilki = pasiūlyta. Tapši, kad priimtum — sistema pati nieko neuždeda.
      </p>
      {jobs.map((job, ji) => {
        const shown = expanded[ji] ? [...job.suggestions, ...job.more] : job.suggestions;
        return (
          <div key={ji} className="border-l-2 border-surface-200 pl-3 dark:border-surface-700">
            <div className="mb-1.5 font-serif text-[0.95rem] text-surface-800 dark:text-surface-200">
              <span className="text-surface-400">{ji + 1}.</span> {job.phrase}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {shown.map((s, idx) => {
                const on = selected.has(s.categoryId);
                return (
                  <button
                    key={s.categoryId}
                    type="button"
                    onClick={() => tap(job, s, idx + 1)}
                    aria-pressed={on}
                    className={
                      "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm transition-colors " +
                      (on
                        ? "border-brand-300 bg-brand-50 font-medium text-brand-800 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200"
                        : "border-surface-200 bg-surface-50 text-surface-500 hover:border-brand-200 hover:bg-white dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300")
                    }
                  >
                    {on && <span className="text-brand-600 dark:text-brand-400">✓</span>}
                    {s.name}
                  </button>
                );
              })}
              {!expanded[ji] && job.more.length > 0 && (
                <button
                  type="button"
                  onClick={() => setExpanded((p) => ({ ...p, [ji]: true }))}
                  className="px-2 py-1 text-xs text-surface-400 hover:text-brand-600"
                >
                  daugiau ({job.more.length})
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  onAddManual();
                  logEvents([{ jobPhrase: job.phrase, action: "added_manual" }]);
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-dashed border-surface-300 px-2.5 py-1 text-sm text-surface-400 hover:bg-surface-50 dark:border-surface-600 dark:hover:bg-surface-800"
              >
                + dar viena
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
