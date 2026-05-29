"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import {
  Sparkles,
  ChevronDown,
  Cpu,
  Zap,
  FileCode2,
  Link2,
  CircleDot,
  Check,
  RotateCcw,
  Save,
  Rocket,
} from "lucide-react";

interface WorkflowStep {
  label: string;
  ai?: boolean;
}
interface PromptBlock {
  key: string;
  label: string;
  tokens: string[];
  text: string;
}
interface CallParams {
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  reasoning?: boolean;
  notes?: string;
}
interface SourceRef {
  file: string;
  lines?: string;
  symbol?: string;
}
interface Touchpoint {
  id: string;
  area: string;
  title: string;
  kind: "llm" | "rule-based";
  audience: string;
  trigger: string;
  summary: string;
  workflow: WorkflowStep[];
  provider: string;
  model: string;
  modelKind: "text" | "image" | "none";
  modelEnvOverride?: string;
  promptVersion?: string;
  auditFeature?: string;
  params: CallParams;
  prompts: PromptBlock[];
  output: string;
  endpoint?: string;
  source: SourceRef[];
}
interface FeatureUsage {
  total: number;
  success: number;
  errors: number;
  avgLatencyMs: number | null;
  lastRunAt: string | null;
  lastErrorCode: string | null;
  totalTokens: number;
  costUsd: number | null;
}
interface ModelOption {
  id: string;
  label: string;
  kind: "text" | "image";
}
interface TouchpointConfig {
  draftModel: string | null;
  draftPrompts: Record<string, string>;
  activeModel: string | null;
  activePrompts: Record<string, string>;
  activatedAt: string | null;
  updatedAt: string | null;
}
interface RegistryData {
  windowDays: number;
  touchpoints: Touchpoint[];
  usage: Record<string, FeatureUsage>;
  configs: Record<string, TouchpointConfig>;
  models: ModelOption[];
}

type ApplyAction = "save" | "activate" | "reset";

function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)} s`;
  return `${ms} ms`;
}

function formatRunTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("lt-LT", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCost(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value === 0) return "$0";
  return `$${value < 1 ? value.toFixed(value < 0.01 ? 4 : 3) : value.toFixed(2)}`;
}

function formatTokens(value: number): string {
  return value > 0 ? value.toLocaleString("lt-LT") : "—";
}

function ParamPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-surface-200/60 bg-surface-50 px-3 py-2 dark:border-surface-700/50 dark:bg-surface-800/40">
      <p className="text-micro text-surface-500">{label}</p>
      <p className="mt-0.5 text-body-sm font-semibold text-surface-800 dark:text-surface-100">
        {value}
      </p>
    </div>
  );
}

function TouchpointCard({
  tp,
  usage,
  config,
  models,
  windowDays,
  onApply,
}: {
  tp: Touchpoint;
  usage?: FeatureUsage;
  config?: TouchpointConfig;
  models: ModelOption[];
  windowDays: number;
  onApply: (action: ApplyAction, payload: { model: string | null; prompts: Record<string, string> }) => Promise<boolean>;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLlm = tp.kind === "llm";
  const editable = tp.modelKind !== "none";

  // Edit buffer — prefers draft, then active, then code default.
  const initModel = config?.draftModel ?? config?.activeModel ?? "";
  const initPrompts = useMemo(() => {
    const out: Record<string, string> = {};
    for (const p of tp.prompts) {
      out[p.key] = config?.draftPrompts[p.key] ?? config?.activePrompts[p.key] ?? p.text;
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tp.id]);

  const [model, setModel] = useState<string>(initModel);
  const [prompts, setPrompts] = useState<Record<string, string>>(initPrompts);
  const [busy, setBusy] = useState<ApplyAction | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const hasActive = Boolean(config?.activeModel) || Object.keys(config?.activePrompts ?? {}).length > 0;

  // Dirty = edit buffer differs from what's currently saved as draft (or default).
  const dirty = useMemo(() => {
    const savedModel = config?.draftModel ?? config?.activeModel ?? "";
    if ((model || "") !== (savedModel || "")) return true;
    for (const p of tp.prompts) {
      const saved = config?.draftPrompts[p.key] ?? config?.activePrompts[p.key] ?? p.text;
      if ((prompts[p.key] ?? "") !== saved) return true;
    }
    return false;
  }, [model, prompts, config, tp.prompts]);

  function changedFromDefault(): { model: string | null; prompts: Record<string, string> } {
    const outPrompts: Record<string, string> = {};
    for (const p of tp.prompts) {
      const val = prompts[p.key] ?? "";
      if (val.trim() && val.trim() !== p.text.trim()) outPrompts[p.key] = val;
    }
    const outModel = model && model !== tp.model ? model : null;
    return { model: outModel, prompts: outPrompts };
  }

  async function handle(action: ApplyAction) {
    setBusy(action);
    setFlash(null);
    if (action === "reset") {
      const ok = await onApply("reset", { model: null, prompts: {} });
      if (ok) {
        setModel("");
        const reset: Record<string, string> = {};
        for (const p of tp.prompts) reset[p.key] = p.text;
        setPrompts(reset);
        setFlash("Atstatyta į numatytąjį");
      }
      setBusy(null);
      return;
    }
    const payload = changedFromDefault();
    const ok = await onApply(action, payload);
    if (ok) setFlash(action === "activate" ? "Aktyvuota — veikia produkcijoje" : "Juodraštis išsaugotas");
    setBusy(null);
  }

  const modelOptions = models.filter((m) => m.kind === tp.modelKind);

  return (
    <Card className="p-0 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start gap-4 p-5 text-left"
      >
        <div
          className={`mt-0.5 rounded-xl p-2.5 ${
            isLlm
              ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
              : "bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400"
          }`}
        >
          {isLlm ? <Sparkles className="h-5 w-5" /> : <CircleDot className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">{tp.title}</h3>
            {!isLlm && (
              <span className="rounded-md bg-surface-100 px-2 py-0.5 text-micro font-medium text-surface-500 dark:bg-surface-800 dark:text-surface-400">
                be LLM
              </span>
            )}
            {hasActive && (
              <span className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-micro font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <Check className="h-3 w-3" /> pakeista
              </span>
            )}
          </div>
          <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">{tp.summary}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-100 px-2.5 py-1 text-micro font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              <Cpu className="h-3.5 w-3.5" />
              {config?.activeModel || tp.model}
            </span>
            <span className="rounded-lg bg-surface-100 px-2.5 py-1 text-micro font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300">
              {tp.audience}
            </span>
            {usage && usage.total > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-micro font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Zap className="h-3.5 w-3.5" />
                {usage.total} kv. / {windowDays} d.
                {usage.errors > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">· {usage.errors} klaid.</span>
                )}
              </span>
            ) : (
              <span className="rounded-lg bg-surface-100 px-2.5 py-1 text-micro text-surface-400 dark:bg-surface-800">
                nėra kvietimų / {windowDays} d.
              </span>
            )}
            {usage && usage.costUsd != null && usage.costUsd > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-surface-100 px-2.5 py-1 text-micro font-medium text-surface-600 dark:bg-surface-800 dark:text-surface-300">
                ≈ {formatCost(usage.costUsd)} / {windowDays} d.
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-surface-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <div className="space-y-6 border-t border-surface-200/60 px-5 py-5 dark:border-surface-700/50">
          <div>
            <h4 className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-surface-500">
              Kada paleidžiama
            </h4>
            <p className="text-body-sm text-surface-700 dark:text-surface-200">{tp.trigger}</p>
          </div>

          <div>
            <h4 className="mb-2 text-caption font-semibold uppercase tracking-wide text-surface-500">Workflow</h4>
            <ol className="space-y-2">
              {tp.workflow.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                      step.ai
                        ? "bg-brand-500 text-white"
                        : "bg-surface-200 text-surface-600 dark:bg-surface-700 dark:text-surface-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1">
                    <span
                      className={`text-body-sm ${
                        step.ai
                          ? "font-semibold text-surface-900 dark:text-white"
                          : "text-surface-700 dark:text-surface-200"
                      }`}
                    >
                      {step.label}
                    </span>
                    {step.ai && (
                      <span className="ml-2 inline-flex items-center gap-1 rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                        <Sparkles className="h-3 w-3" /> AI
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>

          {/* Model picker */}
          {editable ? (
            <div>
              <h4 className="mb-2 text-caption font-semibold uppercase tracking-wide text-surface-500">Modelis</h4>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full max-w-md rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
              >
                <option value="">Numatytasis ({tp.model})</option>
                {modelOptions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label} — {m.id}
                  </option>
                ))}
              </select>
              {tp.modelEnvOverride && (
                <p className="mt-1.5 text-micro text-surface-500">
                  Numatytąjį taip pat galima keisti per env: <code>{tp.modelEnvOverride}</code>
                </p>
              )}
            </div>
          ) : (
            <ParamPill label="Modelis" value={tp.model} />
          )}

          {/* Params (read-only) */}
          <div>
            <h4 className="mb-2 text-caption font-semibold uppercase tracking-wide text-surface-500">Parametrai</h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              <ParamPill label="Tiekėjas" value={tp.provider} />
              {tp.params.temperature != null && (
                <ParamPill label="Temperature" value={String(tp.params.temperature)} />
              )}
              {tp.params.maxTokens != null && <ParamPill label="Max tokens" value={String(tp.params.maxTokens)} />}
              {tp.params.timeoutMs != null && (
                <ParamPill label="Timeout" value={`${tp.params.timeoutMs / 1000} s`} />
              )}
              {tp.params.reasoning != null && (
                <ParamPill label="Reasoning" value={tp.params.reasoning ? "įjungta" : "išjungta"} />
              )}
              {tp.promptVersion && <ParamPill label="Prompt versija" value={tp.promptVersion} />}
            </div>
            {tp.params.notes && <p className="mt-2 text-micro text-surface-500">{tp.params.notes}</p>}
          </div>

          {/* Editable prompts */}
          {tp.prompts.length > 0 && (
            <div>
              <h4 className="mb-2 text-caption font-semibold uppercase tracking-wide text-surface-500">
                Promptai (redaguojami)
              </h4>
              <div className="space-y-4">
                {tp.prompts.map((block) => {
                  const overridden =
                    (config?.activePrompts[block.key] ?? config?.draftPrompts[block.key]) != null;
                  return (
                    <div key={block.key}>
                      <div className="mb-1.5 flex flex-wrap items-center gap-2">
                        <span className="text-body-sm font-medium text-surface-700 dark:text-surface-200">
                          {block.label}
                        </span>
                        {overridden && (
                          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-semibold text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                            pakeista
                          </span>
                        )}
                        {block.tokens.length > 0 && (
                          <span className="text-[11px] text-surface-400">
                            kintamieji:{" "}
                            {block.tokens.map((t) => (
                              <code
                                key={t}
                                className="mr-1 rounded bg-amber-50 px-1 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
                              >{`{{${t}}}`}</code>
                            ))}
                          </span>
                        )}
                      </div>
                      <textarea
                        value={prompts[block.key] ?? ""}
                        onChange={(e) => setPrompts((prev) => ({ ...prev, [block.key]: e.target.value }))}
                        rows={Math.min(20, Math.max(4, (prompts[block.key] ?? "").split("\n").length + 1))}
                        spellCheck={false}
                        className="w-full rounded-xl border border-surface-200 bg-surface-50 px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-surface-800 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
                      />
                      {block.tokens.length > 0 && !block.tokens.every((t) => (prompts[block.key] ?? "").includes(`{{${t}}}`)) && (
                        <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">
                          Dėmesio: trūksta kai kurių {`{{kintamųjų}}`} — be jų duomenys nebus įterpti.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={busy !== null || !dirty}
                  onClick={() => handle("save")}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3.5 py-2 text-body-sm font-medium text-surface-700 transition-colors hover:bg-surface-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:bg-surface-800"
                >
                  <Save className="h-4 w-4" />
                  {busy === "save" ? "Saugoma…" : "Išsaugoti juodraštį"}
                </button>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => handle("activate")}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Rocket className="h-4 w-4" />
                  {busy === "activate" ? "Aktyvuojama…" : "Aktyvuoti"}
                </button>
                {hasActive && (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => handle("reset")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-surface-200 bg-white px-3.5 py-2 text-body-sm font-medium text-surface-600 transition-colors hover:bg-surface-50 disabled:opacity-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {busy === "reset" ? "Atstatoma…" : "Atstatyti numatytąjį"}
                  </button>
                )}
                {flash && (
                  <span className="text-body-sm font-medium text-emerald-600 dark:text-emerald-400">{flash}</span>
                )}
              </div>
              <p className="mt-2 text-micro text-surface-500">
                „Išsaugoti juodraštį“ nieko nekeičia produkcijoje. „Aktyvuoti“ iškart pradeda naudoti šį modelį/promptą realiems vartotojams.
              </p>
            </div>
          )}

          {/* Output */}
          <div>
            <h4 className="mb-1.5 text-caption font-semibold uppercase tracking-wide text-surface-500">Rezultatas</h4>
            <p className="text-body-sm text-surface-700 dark:text-surface-200">{tp.output}</p>
          </div>

          {usage && usage.total > 0 && (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <ParamPill label={`Kvietimai / ${windowDays} d.`} value={String(usage.total)} />
              <ParamPill label="Klaidos" value={String(usage.errors)} />
              <ParamPill label="Vid. trukmė" value={formatLatency(usage.avgLatencyMs)} />
              <ParamPill label="Paskutinis" value={formatRunTime(usage.lastRunAt)} />
              <ParamPill label={`≈ Kaina / ${windowDays} d.`} value={formatCost(usage.costUsd)} />
              <ParamPill label={`Žetonai / ${windowDays} d.`} value={formatTokens(usage.totalTokens)} />
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-surface-200/60 pt-4 dark:border-surface-700/50">
            {tp.endpoint && (
              <div className="flex items-center gap-2 text-micro text-surface-500">
                <Link2 className="h-3.5 w-3.5" />
                <code className="rounded bg-surface-100 px-1.5 py-0.5 text-surface-700 dark:bg-surface-800 dark:text-surface-300">
                  {tp.endpoint}
                </code>
              </div>
            )}
            {tp.source.map((src, i) => (
              <div key={i} className="flex items-center gap-2 text-micro text-surface-500">
                <FileCode2 className="h-3.5 w-3.5" />
                <code className="text-surface-600 dark:text-surface-400">
                  {src.file}
                  {src.lines ? `:${src.lines}` : ""}
                </code>
                {src.symbol && <span className="text-surface-400">· {src.symbol}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

export default function AdminAiRegistryPage() {
  const [data, setData] = useState<RegistryData | null>(null);
  const [configs, setConfigs] = useState<Record<string, TouchpointConfig>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/ai-registry")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setData(res.data);
          setConfigs(res.data.configs ?? {});
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const onApply = useCallback(
    async (
      touchpointId: string,
      action: ApplyAction,
      payload: { model: string | null; prompts: Record<string, string> },
    ): Promise<boolean> => {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ touchpointId, action, model: payload.model, prompts: payload.prompts }),
      })
        .then((r) => r.json())
        .catch(() => null);
      if (!res?.success) return false;

      setConfigs((prev) => {
        const next = { ...prev };
        if (action === "reset") {
          delete next[touchpointId];
          return next;
        }
        const existing = next[touchpointId];
        const base: TouchpointConfig = existing ?? {
          draftModel: null,
          draftPrompts: {},
          activeModel: null,
          activePrompts: {},
          activatedAt: null,
          updatedAt: null,
        };
        if (action === "save") {
          next[touchpointId] = { ...base, draftModel: payload.model, draftPrompts: payload.prompts };
        } else {
          next[touchpointId] = {
            ...base,
            draftModel: payload.model,
            draftPrompts: payload.prompts,
            activeModel: payload.model,
            activePrompts: payload.prompts,
            activatedAt: new Date().toISOString(),
          };
        }
        return next;
      });
      return true;
    },
    [],
  );

  const areas = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    const list: string[] = [];
    for (const tp of data.touchpoints) {
      if (!seen.has(tp.area)) {
        seen.add(tp.area);
        list.push(tp.area);
      }
    }
    return list;
  }, [data]);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

  const llmCount = data.touchpoints.filter((t) => t.kind === "llm").length;
  const totalCalls = Object.values(data.usage).reduce((sum, u) => sum + u.total, 0);
  const totalErrors = Object.values(data.usage).reduce((sum, u) => sum + u.errors, 0);
  const usageValues = Object.values(data.usage);
  const anyCost = usageValues.some((u) => u.costUsd != null);
  const totalCost = usageValues.reduce((sum, u) => sum + (u.costUsd ?? 0), 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-2 flex items-center gap-3">
        <div className="rounded-xl bg-brand-50 p-2.5 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
          <Sparkles className="h-5 w-5" />
        </div>
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">AI žemėlapis</h1>
      </div>
      <p className="mb-6 max-w-3xl text-body-sm text-surface-500 dark:text-surface-400">
        Visi platformos AI keliai vienoje vietoje. Kiekvienam — visas workflow su pažymėtu AI momentu,
        modelis, kvietimo parametrai ir promptas, kurį gali redaguoti ir aktyvuoti. Pakeitimai veikia
        produkcijoje tik po „Aktyvuoti“. Skaičiai — paskutinės {data.windowDays} dienos iš audito žurnalo.
      </p>

      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Card className="p-4">
          <p className="text-micro text-surface-500">AI keliai</p>
          <p className="mt-1 text-heading-2 font-bold text-surface-900 dark:text-white">{llmCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-micro text-surface-500">Iš viso kelių</p>
          <p className="mt-1 text-heading-2 font-bold text-surface-900 dark:text-white">
            {data.touchpoints.length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-micro text-surface-500">Kvietimai / {data.windowDays} d.</p>
          <p className="mt-1 text-heading-2 font-bold text-surface-900 dark:text-white">{totalCalls}</p>
        </Card>
        <Card className="p-4">
          <p className="text-micro text-surface-500">Klaidos / {data.windowDays} d.</p>
          <p
            className={`mt-1 text-heading-2 font-bold ${
              totalErrors > 0
                ? "text-amber-600 dark:text-amber-400"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {totalErrors}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-micro text-surface-500">≈ Kaina / {data.windowDays} d.</p>
          <p className="mt-1 text-heading-2 font-bold text-surface-900 dark:text-white">
            {anyCost ? formatCost(totalCost) : "—"}
          </p>
        </Card>
      </div>

      <div className="space-y-10">
        {areas.map((area) => (
          <section key={area}>
            <h2 className="mb-3 text-heading-3 font-semibold text-surface-900 dark:text-white">{area}</h2>
            <div className="space-y-3">
              {data.touchpoints
                .filter((tp) => tp.area === area)
                .map((tp) => (
                  <TouchpointCard
                    key={tp.id}
                    tp={tp}
                    usage={tp.auditFeature ? data.usage[tp.auditFeature] : undefined}
                    config={configs[tp.id]}
                    models={data.models}
                    windowDays={data.windowDays}
                    onApply={(action, payload) => onApply(tp.id, action, payload)}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
