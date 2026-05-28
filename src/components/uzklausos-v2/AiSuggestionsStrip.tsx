"use client";

import { useState } from "react";
import { Sparkles, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AiSuggestion {
  prompt: string;
  field: string;
  yesAnswer: string;
  noAnswer: string;
}

export type AiSuggestionChoice = "yes" | "no";

interface AiSuggestionsStripProps {
  suggestions: AiSuggestion[];
  /** Called when the user clicks TAIP or NE — append the chosen answer. */
  onAnswer: (suggestion: AiSuggestion, choice: AiSuggestionChoice) => void;
}

/** Thin, dismissible strip showing up to 3 AI YES/NO patikslinimo questions.
 *  Replaces the heavyweight RequestAiAgentPanel from the old form — the AI
 *  work itself runs silently on mount in the page; this strip is the only
 *  visible affordance. Each question dismisses itself after a TAIP/NE click. */
export default function AiSuggestionsStrip({
  suggestions,
  onAnswer,
}: AiSuggestionsStripProps) {
  const [dismissedFields, setDismissedFields] = useState<Set<string>>(new Set());
  const [collapsed, setCollapsed] = useState(false);

  const visible = suggestions
    .filter((s) => !dismissedFields.has(s.field))
    .slice(0, 3);

  if (collapsed || visible.length === 0) return null;

  function handleChoose(suggestion: AiSuggestion, choice: AiSuggestionChoice) {
    onAnswer(suggestion, choice);
    setDismissedFields((prev) => {
      const next = new Set(prev);
      next.add(suggestion.field);
      return next;
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-brand-100 bg-brand-50/50 px-4 py-3 dark:border-brand-900/50 dark:bg-brand-950/20">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 text-body-sm font-medium text-surface-700 dark:text-surface-200">
          <Sparkles className="h-4 w-4 shrink-0 text-brand-600 dark:text-brand-300" />
          <span>AI siūlo patikslinti, kad meistrai geriau įkainotų:</span>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-label="Slėpti AI pasiūlymus"
          className="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-surface-400 transition-colors hover:bg-brand-100/60 hover:text-surface-700 dark:hover:bg-brand-900/30 dark:hover:text-surface-200"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <ul className="mt-3 space-y-2">
        {visible.map((suggestion) => (
          <li
            key={suggestion.field}
            className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-200 bg-white px-3 py-2 dark:border-surface-700 dark:bg-surface-900"
          >
            <span className="min-w-0 flex-1 text-micro text-surface-700 dark:text-surface-200">
              {suggestion.prompt}
            </span>
            <div className="flex shrink-0 items-center gap-1.5">
              <ChoiceButton
                kind="yes"
                title={suggestion.yesAnswer}
                onClick={() => handleChoose(suggestion, "yes")}
              />
              <ChoiceButton
                kind="no"
                title={suggestion.noAnswer}
                onClick={() => handleChoose(suggestion, "no")}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ChoiceButton({
  kind,
  title,
  onClick,
}: {
  kind: "yes" | "no";
  title: string;
  onClick: () => void;
}) {
  const isYes = kind === "yes";
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-micro font-medium transition-colors",
        isYes
          ? "border-brand-300 text-brand-700 hover:bg-brand-100 dark:border-brand-700 dark:text-brand-300 dark:hover:bg-brand-950/40"
          : "border-surface-300 text-surface-600 hover:bg-surface-100 dark:border-surface-600 dark:text-surface-300 dark:hover:bg-surface-800",
      )}
    >
      {isYes ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {isYes ? "Taip" : "Ne"}
    </button>
  );
}
