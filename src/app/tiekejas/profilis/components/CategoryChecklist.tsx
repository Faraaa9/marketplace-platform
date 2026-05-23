"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ServiceCategoryGroup } from "@/lib/service-categories";

interface CategoryChecklistProps {
  groups: ServiceCategoryGroup[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  maxReached: boolean;
}

export default function CategoryChecklist({
  groups,
  selectedIds,
  onToggle,
  maxReached,
}: CategoryChecklistProps) {
  const [openRoots, setOpenRoots] = useState<Set<string>>(new Set());
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);

  useEffect(() => {
    if (selectedIds.length === 0 || groups.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpenRoots((prev) => {
      const next = new Set(prev);
      for (const group of groups) {
        if (group.categories.some((c) => selected.has(c.id))) {
          next.add(group.root.id);
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  function toggleRoot(rootId: string) {
    setOpenRoots((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }

  if (groups.length === 0) {
    return (
      <p className="text-micro text-surface-400 italic">
        Kategorijų sąrašas nepasiekiamas — pabandykite atnaujinti puslapį.
      </p>
    );
  }

  return (
    <div className="space-y-1.5">
      {groups.map((group) => {
        const isOpen = openRoots.has(group.root.id);
        const selectedInGroup = group.categories.filter((c) => selected.has(c.id)).length;
        return (
          <div
            key={group.root.id}
            className="rounded-xl border border-surface-200/60 bg-white dark:border-surface-700/50 dark:bg-surface-800/30 overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleRoot(group.root.id)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800/60"
            >
              <span className="flex items-center gap-2">
                <span className="text-body-sm font-medium text-surface-800 dark:text-surface-200">
                  {group.root.name}
                </span>
                {selectedInGroup > 0 && (
                  <span className="rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-semibold text-brand-700 dark:bg-brand-500/20 dark:text-brand-300">
                    {selectedInGroup}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-surface-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
              />
            </button>
            {isOpen && (
              <div className="border-t border-surface-100 px-2 py-1.5 dark:border-surface-800">
                {group.categories.map((cat) => {
                  const isChecked = selected.has(cat.id);
                  const isDisabled = !isChecked && maxReached;
                  return (
                    <label
                      key={cat.id}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                        isDisabled
                          ? "cursor-not-allowed opacity-40"
                          : "cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isDisabled}
                        onChange={() => onToggle(cat.id)}
                        className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed dark:border-surface-600"
                      />
                      <span className="text-body-sm text-surface-700 dark:text-surface-300">
                        {cat.name}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
