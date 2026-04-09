"use client";

import { useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export default function SearchInput({ defaultValue, basePath = "/uzklausos" }: { defaultValue: string; basePath?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.push(`${basePath}?${params}`);
    }, 400);
  }

  return (
    <div className="relative">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-surface-400 pointer-events-none" />
      <input
        type="text"
        placeholder="Ieškoti pagal pavadinimą ar aprašymą..."
        defaultValue={defaultValue}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full h-11 rounded-xl border border-surface-200 bg-surface-50 pl-10 pr-4 text-body-sm text-surface-900 placeholder:text-surface-400 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 focus:bg-white dark:border-surface-700 dark:bg-surface-800 dark:text-surface-100 dark:focus:bg-surface-800"
      />
    </div>
  );
}
