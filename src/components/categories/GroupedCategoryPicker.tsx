"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Tag, X } from "lucide-react";
import type { ServiceCategoryGroup } from "@/lib/service-categories";

type PickerNode = {
  id: string;
  name: string;
  slug: string;
  childCount?: number;
  children?: PickerNode[];
};

/** Diacritic-insensitive match so "statyba" finds "Statybą". */
const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export interface GroupedCategoryPickerProps {
  groups: ServiceCategoryGroup[];
  /** Currently-selected category (single-select mode). The value semantics are controlled by `mode`. */
  value?: string;
  onChange?: (value: string) => void;
  /**
   * Opt-in multi-select. When true, the picker is driven by `selectedValues`
   * + `onToggle` (and `onClearAll`) instead of `value`/`onChange`. Selecting a
   * row toggles it and keeps the popover open; "Visos kategorijos" clears all.
   */
  multiple?: boolean;
  selectedValues?: string[];
  onToggle?: (value: string) => void;
  onClearAll?: () => void;
  /** Emit `id` (form-style, sent to API) or `slug` (filter-style, goes into URLs). */
  mode?: "id" | "slug";
  /** Form-input modes use this above the trigger. */
  label?: string;
  /** Text shown on the trigger when nothing is picked. */
  placeholder?: string;
  /** Form-input semantics: hide the "all categories" reset row and show an error. */
  required?: boolean;
  error?: string;
  disabled?: boolean;
  className?: string;
  /** Trigger styling: form (full-width pill) or chip (compact filter chip). */
  variant?: "form" | "chip";
  /** Optional explicit id for the trigger button (for label association). */
  id?: string;
}

/**
 * Unified category picker shared by both form inputs and filter UI:
 *
 *   • single-select trigger (chip or full-width pill)
 *   • dropdown on desktop, full-screen bottom sheet on mobile
 *   • diacritic-insensitive search across category names + group titles
 *   • collapsible groups, auto-expands the one that holds the active value
 *
 * The component is fully controlled — the parent owns the value and decides
 * whether changes go to a form state, a URL param, a Zustand store, etc.
 */
export default function GroupedCategoryPicker({
  groups,
  value = "",
  onChange,
  multiple = false,
  selectedValues = [],
  onToggle,
  onClearAll,
  mode = "slug",
  label,
  placeholder = "Pasirink kategoriją",
  required = false,
  error,
  disabled = false,
  className = "",
  variant = "form",
  id,
}: GroupedCategoryPickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const triggerId = id ?? "category-picker";

  // Flat lookup `value -> displayName` so the trigger always renders the right label.
  const labelByValue = useMemo(() => {
    const map = new Map<string, string>();
    function add(cat: PickerNode) {
      map.set(mode === "id" ? cat.id : cat.slug, cat.name);
      for (const child of cat.children ?? []) add(child);
    }
    for (const group of groups) {
      add(group.root);
    }
    return map;
  }, [groups, mode]);

  const activeLabel = value ? labelByValue.get(value) ?? "" : "";
  const hasSelection = multiple ? selectedValues.length > 0 : Boolean(value);
  const triggerLabel = multiple
    ? selectedValues.length > 0
      ? `${placeholder} (${selectedValues.length})`
      : placeholder
    : activeLabel || placeholder;

  // Close popover on outside click or Escape — same UX as native <select>.
  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      if (triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Lock body scroll while the mobile sheet is open.
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined" || window.innerWidth >= 640) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  function select(next: string) {
    if (multiple) {
      // Multi-select: toggle the value and keep the popover open so the user
      // can pick several in a row. The empty value is the "all categories" reset.
      if (next === "") {
        onClearAll?.();
        return;
      }
      onToggle?.(next);
      return;
    }
    onChange?.(next === value ? "" : next);
    setOpen(false);
  }

  const triggerClass =
    variant === "chip"
      ? `flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-body-sm font-medium transition-all duration-150 ${
          hasSelection
            ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
            : "border-surface-200 bg-white text-surface-600 hover:bg-surface-50 hover:border-surface-300 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
        }`
      : `w-full h-10 flex items-center justify-between rounded-xl border bg-white px-3.5 text-body-sm text-left transition-all duration-150 ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600"
            : "border-surface-200 hover:border-surface-300 focus:border-brand-500 dark:border-surface-700 dark:hover:border-surface-600"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""} focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:bg-surface-900 ${
          hasSelection ? "text-surface-900 dark:text-surface-100" : "text-surface-400"
        }`;

  return (
    <div className={`relative ${variant === "chip" ? "inline-block" : "w-full"} ${className}`}>
      {variant === "form" && label && (
        <label
          htmlFor={triggerId}
          className="mb-1.5 block text-body-sm font-medium text-surface-700 dark:text-surface-300"
        >
          {label}
        </label>
      )}

      <button
        type="button"
        id={triggerId}
        ref={triggerRef}
        disabled={disabled || groups.length === 0}
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={triggerClass}
      >
        {variant === "chip" ? (
          <>
            <Tag className="h-3.5 w-3.5" />
            {triggerLabel}
            {!multiple && value ? (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange?.("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    e.stopPropagation();
                    onChange?.("");
                  }
                }}
                className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full hover:bg-brand-200/60 dark:hover:bg-brand-800/60"
                aria-label="Išvalyti kategoriją"
              >
                <X className="h-3 w-3" />
              </span>
            ) : (
              <ChevronDown
                className={`h-3.5 w-3.5 text-surface-400 transition-transform ${open ? "rotate-180" : ""}`}
              />
            )}
          </>
        ) : (
          <>
            <span className="truncate">{triggerLabel}</span>
            <ChevronDown
              className={`ml-2 h-4 w-4 shrink-0 text-surface-400 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>

      {variant === "form" && error && (
        <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{error}</p>
      )}

      {/* Desktop popover */}
      {open && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Kategorijų pasirinkimas"
          className="absolute left-0 top-full z-50 mt-2 hidden max-h-[72vh] w-80 overflow-y-auto overscroll-contain rounded-xl border border-surface-200 bg-white shadow-xl dark:border-surface-700 dark:bg-surface-900 sm:block"
        >
          <CategoryPickerBody
            groups={groups}
            activeValue={value}
            multiple={multiple}
            selectedValues={selectedValues}
            mode={mode}
            showAllOption={!required}
            onSelect={select}
          />
        </div>
      )}

      {/* Mobile full-screen sheet */}
      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 animate-in fade-in duration-150 sm:hidden"
            onClick={() => setOpen(false)}
          />
          <div
            ref={sheetRef}
            className="fixed inset-x-0 bottom-0 z-50 flex h-[85vh] flex-col rounded-t-2xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-200 dark:bg-surface-900 sm:hidden"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-surface-200 dark:bg-surface-700" />
            </div>
            <div className="flex items-center justify-between px-5 pb-2">
              <h3 className="text-body font-semibold text-surface-900 dark:text-white">
                Kategorija
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Uždaryti"
                className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-surface-100 dark:hover:bg-surface-800"
              >
                <X className="h-4 w-4 text-surface-500" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <CategoryPickerBody
                groups={groups}
                activeValue={value}
                mode={mode}
                showAllOption={!required}
                onSelect={select}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Shared list body — also exported so existing wrappers (e.g. the
//     /uzklausos filter sheet) can reuse the exact same search + groups UI.

export interface CategoryPickerBodyProps {
  groups: ServiceCategoryGroup[];
  activeValue: string;
  mode: "id" | "slug";
  showAllOption: boolean;
  onSelect: (value: string) => void;
  multiple?: boolean;
  selectedValues?: string[];
}

export function CategoryPickerBody({
  groups,
  activeValue,
  mode,
  showAllOption,
  onSelect,
  multiple = false,
  selectedValues = [],
}: CategoryPickerBodyProps) {
  const [query, setQuery] = useState("");

  const isSel = (v: string) =>
    multiple ? selectedValues.includes(v) : activeValue === v;
  const noneSelected = multiple ? selectedValues.length === 0 : !activeValue;

  const activeGroupId = useMemo(() => {
    const sel = multiple ? selectedValues : [activeValue].filter(Boolean);
    function hasActive(cat: PickerNode) {
      if (sel.includes(mode === "id" ? cat.id : cat.slug)) return true;
      return (cat.children ?? []).some(hasActive);
    }
    for (const group of groups) {
      if (hasActive(group.root)) {
        return group.root.id;
      }
    }
    return null;
  }, [groups, activeValue, mode, multiple, selectedValues]);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [expandedCats, setExpandedCats] = useState<Set<string>>(() => new Set());

  function toggleGroup(rootId: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(rootId)) next.delete(rootId);
      else next.add(rootId);
      return next;
    });
  }

  function toggleCat(catId: string) {
    setExpandedCats((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }

  const q = normalize(query.trim());
  const isSearching = q.length > 0;

  const matches = useMemo(() => {
    if (!isSearching) return [];
    const out: { id: string; name: string; slug: string; group: string; breadcrumb: string; childCount?: number }[] = [];
    function visit(cat: PickerNode, group: string, parents: string[], groupHit: boolean) {
      const breadcrumb = [...parents, cat.name].join(" / ");
      if (groupHit || normalize(cat.name).includes(q) || normalize(breadcrumb).includes(q)) {
        out.push({ id: cat.id, name: cat.name, slug: cat.slug, group, breadcrumb, childCount: cat.childCount });
      }
      for (const child of cat.children ?? []) visit(child, group, [...parents, cat.name], groupHit);
    }
    for (const group of groups) {
      const groupHit = normalize(group.root.name).includes(q);
      for (const cat of group.categories) {
        visit(cat, group.root.name, [group.root.name], groupHit);
      }
    }
    return out;
  }, [groups, q, isSearching]);

  return (
    <div className="pb-3">
      <div className="sticky top-0 z-10 bg-white px-4 pb-2 pt-4 dark:bg-surface-900">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-surface-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ieškoti kategorijos..."
            aria-label="Ieškoti kategorijos"
            className="h-9 w-full rounded-lg border border-surface-200 bg-white pl-9 pr-3 text-caption text-surface-900 placeholder:text-surface-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/25 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100"
            autoFocus
          />
        </div>
      </div>

      <div className="px-4">
        {showAllOption && (
          <button
            type="button"
            onClick={() => onSelect("")}
            aria-pressed={noneSelected}
            className={`flex w-full items-center rounded-lg px-3 py-2.5 text-left text-caption font-medium transition-colors ${
              noneSelected
                ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
            }`}
          >
            Visos kategorijos
          </button>
        )}

        {isSearching ? (
          matches.length === 0 ? (
            <p className="px-3 py-6 text-center text-caption text-surface-400">
              Kategorijų nerasta
            </p>
          ) : (
            <div className="mt-0.5 space-y-0.5">
              {matches.map((cat) => {
                const v = mode === "id" ? cat.id : cat.slug;
                return (
                  <CategoryRow
                    key={cat.id}
                    name={cat.name}
                    hint={cat.breadcrumb || cat.group}
                    childCount={cat.childCount}
                    isSelected={isSel(v)}
                    onClick={() => onSelect(v)}
                  />
                );
              })}
            </div>
          )
        ) : (
          <div className="mt-0.5 space-y-0.5">
            {groups.map((group) => {
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
                      {group.categories.map((cat) => {
                        const v = mode === "id" ? cat.id : cat.slug;
                        const hasChildren = (cat.children?.length ?? 0) > 0;
                        const catExpanded = expandedCats.has(cat.id);
                        return (
                          <div key={cat.id}>
                            <CategoryRow
                              name={cat.name}
                              childCount={cat.childCount}
                              isSelected={isSel(v)}
                              onClick={() => onSelect(v)}
                              expandable={hasChildren}
                              isExpanded={catExpanded}
                              onToggle={() => toggleCat(cat.id)}
                            />
                            {hasChildren && catExpanded && (
                              <div className="ml-4 border-l border-surface-100 pl-2 dark:border-surface-800">
                                {cat.children?.map((child) => {
                                  const childValue = mode === "id" ? child.id : child.slug;
                                  return (
                                    <CategoryRow
                                      key={child.id}
                                      name={child.name}
                                      isSelected={isSel(childValue)}
                                      onClick={() => onSelect(childValue)}
                                      compact
                                    />
                                  );
                                })}
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
        )}
      </div>
    </div>
  );
}

function CategoryRow({
  name,
  hint,
  childCount,
  isSelected,
  onClick,
  compact = false,
  expandable = false,
  isExpanded = false,
  onToggle,
}: {
  name: string;
  hint?: string;
  childCount?: number;
  isSelected: boolean;
  onClick: () => void;
  compact?: boolean;
  expandable?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSelected}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors ${
          isSelected
            ? "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-400"
            : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
        } ${compact ? "py-1.5" : "py-2.5"}`}
      >
        <span className="min-w-0 flex-1 truncate text-caption font-medium">{name}</span>
        {typeof childCount === "number" && childCount > 0 && (
          <span className="shrink-0 rounded-full bg-surface-100 px-1.5 py-0.5 text-[0.65rem] tabular-nums text-surface-500 dark:bg-surface-800 dark:text-surface-400">
            {childCount}
          </span>
        )}
        {hint && <span className="min-w-0 max-w-[11rem] truncate text-[0.7rem] text-surface-400">{hint}</span>}
        {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />}
      </button>
      {expandable && onToggle && (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "Suskleisti" : "Išskleisti"}
          className="shrink-0 rounded-lg p-2 text-surface-400 transition-colors hover:bg-surface-50 dark:hover:bg-surface-800"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ${isExpanded ? "" : "-rotate-90"}`}
          />
        </button>
      )}
    </div>
  );
}
