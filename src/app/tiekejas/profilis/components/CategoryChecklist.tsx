"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ServiceCategoryGroup } from "@/lib/service-categories";

type CategoryNode = {
  id: string;
  name: string;
  childCount?: number;
  children?: CategoryNode[];
};

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
    setOpenRoots((prev) => {
      const next = new Set(prev);
      function hasSelected(node: CategoryNode): boolean {
        return selected.has(node.id) || (node.children ?? []).some(hasSelected);
      }
      for (const group of groups) {
        if (hasSelected(group.root)) {
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
                  return (
                    <div key={cat.id} className="space-y-0.5">
                      <CategoryCheckbox
                        category={cat}
                        checked={selected.has(cat.id)}
                        disabled={!selected.has(cat.id) && maxReached}
                        onToggle={onToggle}
                      />
                      {(cat.children?.length ?? 0) > 0 && (
                        <div className="ml-4 border-l border-surface-100 pl-2 dark:border-surface-700">
                          {cat.children?.map((child) => (
                            <CategoryCheckbox
                              key={child.id}
                              category={child}
                              checked={selected.has(child.id)}
                              disabled={!selected.has(child.id) && maxReached}
                              onToggle={onToggle}
                              compact
                            />
                          ))}
                        </div>
                      )}
                    </div>
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

function CategoryCheckbox({
  category,
  checked,
  disabled,
  onToggle,
  compact = false,
}: {
  category: CategoryNode;
  checked: boolean;
  disabled: boolean;
  onToggle: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <label
      className={`flex items-center gap-2.5 rounded-lg px-2 transition-colors ${
        compact ? "py-1" : "py-1.5"
      } ${
        disabled
          ? "cursor-not-allowed opacity-40"
          : "cursor-pointer hover:bg-surface-50 dark:hover:bg-surface-800/60"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={() => onToggle(category.id)}
        className="h-4 w-4 rounded border-surface-300 text-brand-600 focus:ring-brand-500 disabled:cursor-not-allowed dark:border-surface-600"
      />
      <span className={`min-w-0 flex-1 truncate ${compact ? "text-caption" : "text-body-sm"} text-surface-700 dark:text-surface-300`}>
        {category.name}
      </span>
      {typeof category.childCount === "number" && category.childCount > 0 && (
        <span className="rounded-full bg-surface-100 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-surface-500 dark:bg-surface-800 dark:text-surface-400">
          {category.childCount}
        </span>
      )}
    </label>
  );
}
