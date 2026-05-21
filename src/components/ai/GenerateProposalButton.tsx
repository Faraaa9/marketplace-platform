"use client";

import { useState } from "react";
import { Sparkles, Loader2, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GenerateProposalButtonProps {
  requestId: string;
  value: string;
  onChange: (next: string) => void;
  /** id of the textarea to focus after the draft is filled in. */
  targetId?: string;
  className?: string;
}

export default function GenerateProposalButton({
  requestId,
  value,
  onChange,
  targetId,
  className,
}: GenerateProposalButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<{ before: string; after: string } | null>(null);

  const hasContent = value.trim().length > 0;
  const showUndo = undoState !== null && value === undoState.after && !isGenerating;

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

  async function handleGenerate() {
    if (isGenerating) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${requestId}/juodrastis`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = (await res.json().catch(() => null)) as
        | { success?: boolean; error?: string; data?: { message?: string } }
        | null;
      const message = data?.data?.message;

      if (!res.ok || !data?.success || typeof message !== "string") {
        setError(data?.error || "Nepavyko sukurti pasiūlymo. Bandykite vėliau.");
        return;
      }

      setUndoState({ before: value, after: message });
      onChange(message);
      focusTarget();
    } catch {
      setError("Nepavyko sukurti pasiūlymo. Bandykite vėliau.");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleUndo() {
    if (!undoState) return;
    onChange(undoState.before);
    setUndoState(null);
    setError(null);
  }

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating}
          aria-label="Sukurti pasiūlymą su dirbtiniu intelektu"
          className={cn(
            "inline-flex items-center gap-2 rounded-full text-sm font-medium transition-colors",
            "border border-surface-200 bg-white px-3.5 py-1.5 text-surface-700 hover:border-surface-300 hover:bg-surface-50",
            "dark:border-surface-700 dark:bg-surface-900 dark:text-surface-300 dark:hover:bg-surface-800",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 text-brand-600 dark:text-brand-400" />
          )}
          {isGenerating
            ? "Kuriamas pasiūlymas…"
            : hasContent
              ? "Perkurti pasiūlymą su AI"
              : "Sukurti pasiūlymą su AI"}
        </button>

        {showUndo && (
          <button
            type="button"
            onClick={handleUndo}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              "text-surface-500 hover:bg-surface-100 dark:text-surface-400 dark:hover:bg-surface-800",
            )}
          >
            <Undo2 className="h-3.5 w-3.5" />
            Atšaukti
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-500 dark:text-red-400">
          {error}
        </p>
      )}

      {!error && (
        <p className="text-micro text-surface-400">
          AI parengia juodraštį iš jūsų profilio. Peržiūrėkite ir pakoreguokite prieš siųsdami.
        </p>
      )}
    </div>
  );
}
