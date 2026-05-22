"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, Search } from "lucide-react";
import type { ServiceCategoryGroup } from "@/lib/service-categories";

/** Diacritic-insensitive match so "statyba" finds "Statybą". */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

interface CategoryFilterProps {
  categoryGroups: ServiceCategoryGroup[];
  activeCategory: string;
}

export default function CategoryFilter({
  categoryGroups,
  activeCategory,
}: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");

  const activeGroupId = useMemo(() => {
    for (const group of categoryGroups) {
      if (group.categories.some((cat) => cat.slug === activeCategory)) {
        return group.root.id;
      }
    }
    return null;
  }, [categoryGroups, activeCategory]);

  // Expand the group holding the active category by default; user controls the rest.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(activeGroupId ? [activeGroupId] : []),
  );

  function toggleGroup(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug && slug !== activeCategory) params.set("category", slug);
    else params.delete("category");
    params.delete("page");
    const qs = params.toString();
    router.push(`/uzklausos${qs ? `?${qs}` : ""}`);
  }

  const q = normalize(query.trim());
  const isSearching = q.length > 0;

  // When searching, a matching group name pulls in all of its categories.
  const matches = useMemo(() => {
    if (!isSearching) return [];
    const out: { id: string; name: string; slug: string; group: string }[] = [];
    for (const group of categoryGroups) {
      const groupHit = normalize(group.root.name).includes(q);
      for (const cat of group.categories) {
        if (groupHit || normalize(cat.name).includes(q)) {
          out.push({ ...cat, group: group.root.name });
        }
      }
    }
    return out;
  }, [categoryGroups, q, isSearching]);

  return (
    <div className="pb-3">
      <div className="sticky top-0 z-10 bg-[#fbfaf6] px-4 pb-2 pt-4 dark:bg-surface-900">
        <p className="mb-2 text-caption font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
          Kategorija
        </p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ieškoti kategorijos..."
            aria-label="Ieškoti kategorijos"
            className="h-9 w-full rounded-lg border border-[#cdc09f] bg-white pl-9 pr-3 text-caption text-surface-900 placeholder:text-surface-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
          />
        </div>
      </div>

      <div className="px-4">
        <button
          type="button"
          onClick={() => select("")}
          aria-pressed={!activeCategory}
          className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-caption font-medium transition-colors ${
            !activeCategory
              ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
              : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
          }`}
        >
          Visos kategorijos
        </button>

        {isSearching ? (
          matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-caption text-surface-400">
              Kategorijų nerasta
            </p>
          ) : (
            <div className="mt-0.5 space-y-0.5">
              {matches.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  name={cat.name}
                  hint={cat.group}
                  isSelected={activeCategory === cat.slug}
                  onClick={() => select(cat.slug)}
                />
              ))}
            </div>
          )
        ) : (
          <div className="mt-0.5 space-y-0.5">
            {categoryGroups.map((group) => {
              const isExpanded = expanded.has(group.root.id);
              const holdsActive = group.root.id === activeGroupId;
              return (
                <div key={group.root.id}>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.root.id)}
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-50 dark:hover:bg-surface-800"
                  >
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 text-surface-400 transition-transform duration-150 ${
                        isExpanded ? "" : "-rotate-90"
                      }`}
                    />
                    <span className="min-w-0 flex-1 truncate text-caption font-semibold text-surface-700 dark:text-surface-200">
                      {group.root.name}
                    </span>
                    {holdsActive && !isExpanded && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                    )}
                    <span className="shrink-0 text-[0.7rem] tabular-nums text-surface-400">
                      {group.categories.length}
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="space-y-0.5 pb-1 pl-4">
                      {group.categories.map((cat) => (
                        <CategoryRow
                          key={cat.id}
                          name={cat.name}
                          isSelected={activeCategory === cat.slug}
                          onClick={() => select(cat.slug)}
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
    </div>
  );
}

function CategoryRow({
  name,
  hint,
  isSelected,
  onClick,
}: {
  name: string;
  hint?: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
        isSelected
          ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
          : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
      }`}
    >
      <span className="min-w-0 flex-1 truncate text-caption font-medium">
        {name}
      </span>
      {hint && (
        <span className="shrink-0 text-[0.7rem] text-surface-400">{hint}</span>
      )}
      {isSelected && (
        <Check className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
      )}
    </button>
  );
}
