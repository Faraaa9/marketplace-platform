"use client";

import { useState } from "react";
import { X, MapPin, Clock, Wallet, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { BUDGET_OPTIONS } from "@/lib/constants";

export interface RequestBrief {
  title: string;
  description: string;
  categoryLabel: string;
  location?: string | null;
  budget?: string | null;
  deadline?: string | null;
  createdAt?: string | null;
  responseCount?: number | null;
  attachmentCount?: number | null;
}

function budgetLabel(value?: string | null) {
  if (!value) return null;
  return BUDGET_OPTIONS.find((b) => b.value === value)?.label || value;
}

export function RequestBriefDrawer({
  brief,
  triggerClassName,
}: {
  brief: RequestBrief;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const budget = budgetLabel(brief.budget);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-surface-900 px-3.5 py-2 text-body-sm font-semibold text-white transition hover:bg-brand-300 focus:outline-none focus:ring-2 focus:ring-brand-300/30",
          triggerClassName,
        )}
      >
        Peržiūrėti
      </button>

      <div
        className={cn(
          "fixed inset-0 z-50 transition",
          open ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!open}
      >
        <div
          className={cn(
            "absolute inset-0 bg-surface-950/45 transition-opacity",
            open ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setOpen(false)}
        />
        <aside
          className={cn(
            "absolute bottom-0 right-0 top-0 w-full max-w-2xl overflow-y-auto border-l border-surface-200 bg-white shadow-2xl transition-transform duration-200 dark:border-surface-700 dark:bg-surface-900 sm:w-[min(640px,92vw)]",
            open ? "translate-x-0" : "translate-x-full",
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Užklausos peržiūra"
        >
          <div className="sticky top-0 z-10 flex min-h-[72px] items-center justify-between border-b border-surface-200 bg-white/95 px-6 backdrop-blur dark:border-surface-700 dark:bg-surface-900/95">
            <div>
              <p className="text-micro font-semibold uppercase tracking-wide text-surface-400">
                Užklausos peržiūra
              </p>
              <p className="text-body-sm font-semibold text-surface-900 dark:text-white">
                {brief.categoryLabel}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="grid min-h-11 min-w-11 place-items-center rounded-xl text-surface-500 transition hover:bg-surface-50 hover:text-surface-900 dark:hover:bg-surface-800 dark:hover:text-white"
              aria-label="Uždaryti"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 sm:p-8">
            <div className="relative rounded-2xl border border-surface-0 bg-white p-5 shadow-lg dark:border-surface-700 dark:bg-surface-950/40 sm:p-7">
              <span className="inline-flex rounded-lg bg-brand-50 px-2.5 py-1 text-micro font-semibold text-brand-700 dark:bg-brand-950 dark:text-brand-400">
                {brief.categoryLabel}
              </span>
              <h2 className="mt-4 text-heading-2 font-semibold text-surface-900 dark:text-white">
                {brief.title}
              </h2>
              <p className="mt-3 whitespace-pre-wrap text-body leading-relaxed text-surface-600 dark:text-surface-300">
                {brief.description}
              </p>

              <div className="mt-6 grid gap-3 border-t border-surface-200 pt-5 text-body-sm dark:border-surface-700 sm:grid-cols-2">
                {brief.location && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                    <MapPin className="h-4 w-4 text-surface-400" />
                    {brief.location}
                  </div>
                )}
                {budget && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                    <Wallet className="h-4 w-4 text-surface-400" />
                    {budget}
                  </div>
                )}
                {brief.deadline && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                    <Clock className="h-4 w-4 text-surface-400" />
                    {brief.deadline}
                  </div>
                )}
                {typeof brief.attachmentCount === "number" && brief.attachmentCount > 0 && (
                  <div className="flex items-center gap-2 text-surface-600 dark:text-surface-300">
                    <Paperclip className="h-4 w-4 text-surface-400" />
                    {brief.attachmentCount} priedai
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
