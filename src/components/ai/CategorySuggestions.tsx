"use client";

import { useState } from "react";
import { Sparkles, Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CategorySuggestion {
  id: string;
  slug: string;
  name: string;
  breadcrumb: string[];
  depth: number;
  confidence: number;
  reason: string;
}

interface CategorySuggestionsProps {
  mode: "request" | "provider";
  text: string;
  title?: string;
  /** Currently-picked category ids. Selected chips show a check + are disabled. */
  selectedIds: string[];
  onSelect: (suggestion: CategorySuggestion) => void;
  /** Provider-mode safeguard: chips become inert once the parent has hit the cap. */
  maxReached?: boolean;
  minLength?: number;
  className?: string;
}

const BUTTON_LABEL: Record<CategorySuggestionsProps["mode"], string> = {
  request: "Pasiūlyti kategoriją",
  provider: "Pasiūlyti pagal aprašymą",
};

const EMPTY_LABEL: Record<CategorySuggestionsProps["mode"], string> = {
  request:
    "Nepavyko parinkti automatiškai — pasirinkite rankiniu būdu.",
  provider:
    "Nepavyko parinkti automatiškai — žemiau pasirinkite paslaugas rankiniu būdu.",
};

export default function CategorySuggestions({
  mode,
  text,
  title,
  selectedIds,
  onSelect,
  maxReached = false,
  minLength = 15,
  className,
}: CategorySuggestionsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<CategorySuggestion[] | null>(null);
  const [clarification, setClarification] = useState<string | null>(null);

  const canRequest = text.trim().length >= minLength;
  const selectedSet = new Set(selectedIds);

  async function handleRequest() {
    if (!canRequest || loading) return;
    setLoading(true);
    setError(null);
    setClarification(null);
    try {
      const res = await fetch("/api/category-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          text,
          title: title || undefined,
          limit: mode === "provider" ? 6 : 5,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | {
            success?: boolean;
            error?: string;
            data?: {
              suggestions?: CategorySuggestion[];
              clarificationQuestion?: string;
            };
          }
        | null;
      if (!res.ok || !data?.success) {
        setError(data?.error || EMPTY_LABEL[mode]);
        setSuggestions([]);
        return;
      }
      const list = Array.isArray(data.data?.suggestions) ? data.data.suggestions : [];
      setSuggestions(list);
      const question = data.data?.clarificationQuestion?.trim();
      setClarification(question && question.length > 0 ? question : null);
    } catch {
      setError(EMPTY_LABEL[mode]);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRequest}
          disabled={!canRequest || loading}
          aria-label={BUTTON_LABEL[mode]}
          className={cn(
            "inline-flex items-center gap-2 rounded-full border border-surface-200 bg-white px-3.5 py-1.5 text-sm font-medium text-surface-700 transition-colors",
            "hover:border-surface-300 hover:bg-surface-50",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800",
          )}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          )}
          {loading ? "Ieškoma…" : BUTTON_LABEL[mode]}
        </button>
        {!canRequest && (
          <span className="text-xs text-surface-400">
            Įveskite bent {minLength} simbolių aprašymo
          </span>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="inline-flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {suggestions && suggestions.length === 0 && !error && (
        <p className="text-xs text-surface-500 dark:text-surface-400">
          {EMPTY_LABEL[mode]}
        </p>
      )}

      {clarification && (
        <p className="text-xs text-surface-500 dark:text-surface-400">
          {clarification}
        </p>
      )}

      {suggestions && suggestions.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {suggestions.map((suggestion) => {
            const isSelected = selectedSet.has(suggestion.id);
            const disableForCap = mode === "provider" && !isSelected && maxReached;
            const disabled = disableForCap;
            const trail = suggestion.breadcrumb.slice(0, -1).join(" › ");
            return (
              <li key={suggestion.id}>
                <button
                  type="button"
                  onClick={() => {
                    if (disabled) return;
                    onSelect(suggestion);
                  }}
                  disabled={disabled}
                  title={suggestion.reason}
                  aria-pressed={isSelected}
                  className={cn(
                    "group flex max-w-[18rem] flex-col items-start gap-0.5 rounded-xl border px-3 py-2 text-left transition-colors",
                    isSelected
                      ? "border-brand-200 bg-brand-50 text-brand-800 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-200"
                      : "border-surface-200 bg-white text-surface-700 hover:border-brand-200 hover:bg-brand-50/40 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-200 dark:hover:bg-brand-950/40",
                    disabled && "cursor-not-allowed opacity-50 hover:bg-white dark:hover:bg-surface-900",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-sm font-medium leading-tight">
                    {isSelected && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                    )}
                    {suggestion.name}
                  </span>
                  {trail && (
                    <span className="text-[0.7rem] leading-tight text-surface-400">
                      {trail}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
