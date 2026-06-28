"use client";

import { useState } from "react";

// PHASE 0 vertical-slice demo (feature branch, not main). Shows: segmentation ->
// per-job grey suggestion chips -> tap-to-activate. UX = C (system never
// auto-activates). No DB; ~15 hardcoded category vectors behind /api/demo-multilabel.

interface Suggestion { name: string; slug: string; score: number }
interface Job { phrase: string; suggestions: Suggestion[] }

const PRESETS = [
  "Sienų dažymas, plytelių klojimas ir kriauklės",
  "Reikia perdažyti kambarį, paklijuoti tapetus ir pakeisti laminatą",
  "Pilna vonios renovacija — nugriauti senas plyteles, paklijuoti naujas, pajungti klozetą",
];

export default function DemoMultilabel() {
  const [text, setText] = useState(PRESETS[0]);
  const [loading, setLoading] = useState(false);
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  // active[jobIndex] = Set of accepted slugs; expanded[jobIndex] = show all 5
  const [active, setActive] = useState<Record<number, Set<string>>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  async function run() {
    setLoading(true); setError(null); setJobs(null); setActive({}); setExpanded({});
    try {
      const res = await fetch("/api/demo-multilabel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "klaida"); return; }
      setJobs(data.jobs);
    } catch (e) { setError(String(e)); }
    finally { setLoading(false); }
  }

  function toggle(ji: number, slug: string) {
    setActive((prev) => {
      const next = { ...prev };
      const set = new Set(next[ji] ?? []);
      set.has(slug) ? set.delete(slug) : set.add(slug);
      next[ji] = set;
      return next;
    });
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-brand-600">
        Phase 0 demo · multi-label
      </div>
      <h1 className="mb-4 font-serif text-2xl text-surface-900">Skaidymas → pasiūlymai → patvirtinimas</h1>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button key={p} type="button" onClick={() => setText(p)}
            className="rounded-full border border-surface-200 bg-white px-3 py-1 text-xs text-surface-600 hover:border-brand-300 hover:bg-brand-50/40">
            {p.length > 38 ? p.slice(0, 38) + "…" : p}
          </button>
        ))}
      </div>

      <textarea value={text} onChange={(e) => setText(e.target.value)} rows={3}
        className="w-full rounded-xl border border-surface-200 bg-white p-3 text-sm text-surface-800 focus:border-brand-400 focus:outline-none" />

      <button type="button" onClick={run} disabled={loading}
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
        {loading ? "Skaidoma…" : "Skaidyti ir pasiūlyti"}
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {jobs && (
        <div className="mt-8 flex flex-col gap-6">
          <p className="text-xs text-surface-400">
            Pilki = pasiūlyta. Tapši, kad priimtum (sistema pati neuždeda aktyvaus chip&apos;o).
          </p>
          {jobs.map((job, ji) => {
            const shown = expanded[ji] ? job.suggestions : job.suggestions.slice(0, 3);
            const act = active[ji] ?? new Set<string>();
            return (
              <div key={ji} className="border-l-2 border-surface-200 pl-4">
                <div className="mb-2 font-serif text-base text-surface-800">
                  <span className="text-surface-400">{ji + 1}.</span> {job.phrase}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {shown.map((s) => {
                    const on = act.has(s.slug);
                    return (
                      <button key={s.slug} type="button" onClick={() => toggle(ji, s.slug)}
                        className={
                          "inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-sm transition-colors " +
                          (on
                            ? "border-brand-300 bg-brand-50 font-medium text-brand-800"
                            : "border-surface-200 bg-surface-50 text-surface-500 hover:border-brand-200 hover:bg-white")
                        }>
                        {on && <span className="text-brand-600">✓</span>}
                        {s.name}
                      </button>
                    );
                  })}
                  {!expanded[ji] && job.suggestions.length > 3 && (
                    <button type="button" onClick={() => setExpanded((p) => ({ ...p, [ji]: true }))}
                      className="px-2 py-1 text-xs text-surface-400 hover:text-brand-600">
                      daugiau ({job.suggestions.length - 3})
                    </button>
                  )}
                  <button type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-surface-300 px-2.5 py-1 text-sm text-surface-400 hover:bg-surface-50">
                    + dar viena
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
