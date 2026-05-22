"use client";

import { cn } from "@/lib/utils";
import type { ServiceCategoryGroup } from "@/lib/service-categories";

interface CategorySelectProps {
  id?: string;
  label?: string;
  /** Grouped curated categories. The `<option>` value is the category `id`. */
  groups: ServiceCategoryGroup[];
  /** Selected category id, or "" when nothing is picked. */
  value: string;
  onChange: (categoryId: string) => void;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
}

/**
 * Grouped category picker for the request flow: one `<optgroup>` per root,
 * depth-1 categories as `<option>`s. A request picks exactly one category.
 */
export default function CategorySelect({
  id = "categoryId",
  label = "Kategorija",
  groups,
  value,
  onChange,
  error,
  disabled,
  placeholder = "Pasirink kategoriją",
}: CategorySelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={id}
          className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        disabled={disabled || groups.length === 0}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full h-10 rounded-xl border bg-white px-3.5 text-body-sm text-surface-900 appearance-none",
          "transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "dark:bg-surface-900 dark:text-surface-100",
          "bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239ca3af%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_12px_center] bg-no-repeat pr-10",
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600"
            : "border-surface-200 dark:border-surface-700",
        )}
      >
        <option value="">{placeholder}</option>
        {groups.map((group) => (
          <optgroup key={group.root.id} label={group.root.name}>
            {group.categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      {error && <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{error}</p>}
    </div>
  );
}
