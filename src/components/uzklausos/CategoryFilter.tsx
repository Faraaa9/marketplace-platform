"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ServiceCategoryGroup } from "@/lib/service-categories";
import { CategoryPickerBody } from "@/components/categories/GroupedCategoryPicker";

interface CategoryFilterProps {
  categoryGroups: ServiceCategoryGroup[];
  activeCategory: string;
}

/**
 * Thin URL-aware wrapper around the shared GroupedCategoryPicker body.
 * Picking a category pushes `?category=<slug>` onto the URL and drops the
 * `page` param so pagination restarts. Used inside the /uzklausos filter sheet.
 */
export default function CategoryFilter({
  categoryGroups,
  activeCategory,
}: CategoryFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function select(slug: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (slug && slug !== activeCategory) params.set("category", slug);
    else params.delete("category");
    params.delete("page");
    const qs = params.toString();
    router.push(`/uzklausos${qs ? `?${qs}` : ""}`);
  }

  return (
    <CategoryPickerBody
      groups={categoryGroups}
      activeValue={activeCategory}
      mode="slug"
      showAllOption
      onSelect={select}
    />
  );
}
