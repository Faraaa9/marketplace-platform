"use client";

import { useEffect, useState } from "react";
import { Rows2, Rows3 } from "lucide-react";

const STORAGE_KEY = "uzklausos-density";
type Density = "comfortable" | "compact";

export default function DensityToggle() {
  const [density, setDensity] = useState<Density>("comfortable");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = typeof window === "undefined" ? null : localStorage.getItem(STORAGE_KEY);
    if (saved === "compact") setDensity("compact");
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (density === "compact") {
      document.documentElement.setAttribute("data-density", "compact");
    } else {
      document.documentElement.removeAttribute("data-density");
    }
    try {
      localStorage.setItem(STORAGE_KEY, density);
    } catch {
      // localStorage may be unavailable (private mode, quota) — ignore.
    }
  }, [density, hydrated]);

  const isCompact = density === "compact";
  const label = isCompact ? "Erdvesnis vaizdas" : "Tankesnis vaizdas";

  return (
    <button
      type="button"
      onClick={() => setDensity(isCompact ? "comfortable" : "compact")}
      aria-pressed={isCompact}
      aria-label={label}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg transition-all ${
        isCompact
          ? "bg-[#fbfaf6] text-surface-900 shadow-sm ring-1 ring-inset ring-[#cdc09f] dark:bg-surface-800 dark:text-white dark:ring-surface-600"
          : "text-surface-500 hover:bg-surface-50/70 hover:text-surface-800 dark:hover:bg-surface-800"
      }`}
      suppressHydrationWarning
    >
      {isCompact ? <Rows2 className="h-4 w-4" /> : <Rows3 className="h-4 w-4" />}
    </button>
  );
}
