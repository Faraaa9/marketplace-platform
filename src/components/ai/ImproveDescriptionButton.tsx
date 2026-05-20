"use client";

import { useState } from "react";
import { Sparkles, Loader2, Undo2, Lightbulb, Plus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Recommendation {
  prompt: string;
  field: string;
}

interface ImproveMeta {
  category: string;
  title: string;
  location: string;
}

interface ImproveDescriptionButtonProps {
  value: string;
  onChange: (next: string) => void;
  /** Called after a successful improve with the AI-extracted category/title/city. */
  onMeta?: (meta: ImproveMeta) => void;
  /** id of the textarea to focus after a recommendation line is appended. */
  targetId?: string;
  category?: string;
  title?: string;
  tone?: "hero" | "form";
  minLength?: number;
  className?: string;
}

export default function ImproveDescriptionButton({
  value,
  onChange,
  onMeta,
  targetId,
  category,
  title,
  tone = "form",
  minLength = 15,
  className,
}: ImproveDescriptionButtonProps) {
  const [isImproving, setIsImproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<{ before: string; after: string } | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [addedFields, setAddedFields] = useState<string[]>([]);

  const canImprove = value.trim().length >= minLength;
  const showUndo = undoState !== null && value === undoState.after && !isImproving;
  const hero = tone === "hero";

  function focusTarget() {
    if (!targetId) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(targetId);
      if (el instanceof HTMLTextAreaElement) {
        el.focus();
        const end = el.value.length;
        el.setSelectionRange(end, end);
        el.scrollTop = el.scrollHeight;
      }
    });
  }

  function appendFields(fields: string[]) {
    if (fields.length === 0) return;
    const block = fields.map((f) => `- ${f}: `).join("\n");
    const sep = value.length === 0 || value.endsWith("\n") ? "" : "\n";
    onChange(`${value}${sep}${block}`);
    setAddedFields((prev) => Array.from(new Set([...prev, ...fields])));
    focusTarget();
  }

  async function handleImprove() {
    if (!canImprove || isImproving) return;
    setIsImproving(true);
    setError(null);
    setRecommendations([]);
    setAddedFields([]);
    try {
      const res = await fetch("/api/requests/improve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: value, category, title }),
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
              recommendations?: Recommendation[];
            };
          }
        | null;
      const improved = data?.data?.improvedDescription;

      if (!res.ok || !data?.success || typeof improved !== "string") {
        setError(data?.error || "Nepavyko patobulinti. Bandykite vėliau.");
        return;
      }

      setUndoState({ before: value, after: improved });
      onChange(improved);
      onMeta?.({
        category: data.data?.category || "",
        title: data.data?.title || "",
        location: data.data?.location || "",
      });
      const recs = data.data?.recommendations;
      setRecommendations(
        Array.isArray(recs)
          ? recs.filter(
              (r): r is Recommendation =>
                !!r &&
                typeof r.prompt === "string" &&
                typeof r.field === "string" &&
                r.prompt.trim().length > 0 &&
                r.field.trim().length > 0,
            )
          : [],
      );
    } catch {
      setError("Nepavyko patobulinti. Bandykite vėliau.");
    } finally {
      setIsImproving(false);
    }
  }

  function handleUndo() {
    if (!undoState) return;
    onChange(undoState.before);
    setUndoState(null);
    setError(null);
    setRecommendations([]);
    setAddedFields([]);
  }

  const buttonClass = hero
    ? "border border-[#D8D2C6] bg-[#F1EDE4]/70 px-4 py-2 text-[#57534C] hover:bg-[#E9E4D9]"
    : "border border-surface-200 bg-white px-3.5 py-1.5 text-surface-700 hover:border-surface-300 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800";

  const iconClass = hero ? "text-[#C25E3A]" : "text-brand-600 dark:text-brand-400";

  const undoClass = hero
    ? "text-[#57534C] hover:bg-[#E9E4D9]"
    : "text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800";

  const remaining = recommendations.filter((r) => !addedFields.includes(r.field));

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleImprove}
          disabled={!canImprove || isImproving}
          aria-label="Sutvarkyti aprašymą su dirbtiniu intelektu"
          className={cn(
            "inline-flex items-center gap-2 rounded-full text-sm font-medium transition-colors",
            "disabled:cursor-not-allowed disabled:opacity-50",
            buttonClass,
          )}
        >
          {isImproving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className={cn("h-4 w-4", iconClass)} />
          )}
          {isImproving ? "Tvarkoma…" : "Sutvarkyti aprašymą"}
        </button>

        {showUndo && (
          <button
            type="button"
            onClick={handleUndo}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              undoClass,
            )}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Atšaukti
          </button>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className={cn("text-xs", hero ? "text-[#B4451F]" : "text-red-500 dark:text-red-400")}
        >
          {error}
        </p>
      )}

      {recommendations.length > 0 && (
        <div
          className={cn(
            "mt-1 rounded-xl border p-3",
            hero
              ? "border-[#E2DDD2] bg-[#F1EDE4]/80"
              : "border-surface-200 bg-surface-50 dark:border-surface-700 dark:bg-surface-800/50",
          )}
        >
          <div className="flex items-center gap-1.5">
            <Lightbulb className={cn("h-3.5 w-3.5 shrink-0", iconClass)} />
            <p
              className={cn(
                "text-xs font-semibold",
                hero ? "text-[#57534C]" : "text-surface-700 dark:text-surface-200",
              )}
            >
              Kad tiekėjai galėtų tiksliai įkainoti — spustelėkite ir papildykite:
            </p>
          </div>

          <ul className="mt-1.5 space-y-0.5">
            {recommendations.map((rec) => {
              const added = addedFields.includes(rec.field);
              return (
                <li key={rec.field}>
                  <button
                    type="button"
                    disabled={added}
                    onClick={() => appendFields([rec.field])}
                    className={cn(
                      "flex w-full items-start gap-1.5 rounded-lg px-2 py-1.5 text-left text-xs leading-relaxed transition-colors",
                      added
                        ? "cursor-default opacity-60"
                        : hero
                          ? "text-[#57534C] hover:bg-[#E9E4D9]"
                          : "text-surface-600 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800",
                    )}
                  >
                    {added ? (
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Plus className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", iconClass)} />
                    )}
                    <span className={added ? "line-through" : ""}>{rec.prompt}</span>
                  </button>
                </li>
              );
            })}
          </ul>

          {remaining.length >= 2 && (
            <button
              type="button"
              onClick={() => appendFields(remaining.map((r) => r.field))}
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors",
                hero
                  ? "text-[#C25E3A] hover:bg-[#E9E4D9]"
                  : "text-brand-600 hover:bg-surface-100 dark:text-brand-400 dark:hover:bg-surface-800",
              )}
            >
              <Plus className="h-3.5 w-3.5" />
              Pridėti visus
            </button>
          )}
        </div>
      )}
    </div>
  );
}
