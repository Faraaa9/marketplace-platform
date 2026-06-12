"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, ChevronDown, MapPin, X } from "lucide-react";

interface CityFilterProps {
  cities: string[];
  activeLocation: string;
}

/** Compact "Miestas ▾" dropdown — mirrors the provider catalog filter pattern. */
export default function CityFilter({ cities, activeLocation }: CityFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
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

  function select(city: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (city) params.set("location", city);
    else params.delete("location");
    params.delete("page");
    const qs = params.toString();
    router.push(`/uzklausos${qs ? `?${qs}` : ""}`);
    setOpen(false);
  }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={activeLocation ? `Miestas: ${activeLocation}` : "Pasirinkti miestą"}
        className={`flex h-11 items-center gap-1.5 rounded-lg border px-3.5 text-body-sm font-medium transition-all duration-150 ${
          activeLocation || open
            ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-800 dark:bg-brand-950 dark:text-brand-400"
            : "border-surface-200 bg-surface-50 text-surface-600 hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700"
        }`}
      >
        <MapPin className="h-4 w-4 shrink-0" />
        <span className="max-w-[7rem] truncate">{activeLocation || "Miestas"}</span>
        {activeLocation ? (
          <span
            onClick={(event) => {
              event.stopPropagation();
              select("");
            }}
            className="ml-0.5 flex h-5 w-5 items-center justify-center rounded-full hover:bg-brand-200/60 dark:hover:bg-brand-800/60"
          >
            <X className="h-3 w-3" />
          </span>
        ) : (
          <ChevronDown
            className={`h-3.5 w-3.5 shrink-0 text-surface-400 transition-transform duration-150 ${
              open ? "rotate-180" : ""
            }`}
          />
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 max-h-72 w-56 max-w-[calc(100vw-2rem)] overflow-y-auto overscroll-contain rounded-xl border border-surface-200 bg-surface-50 p-1.5 shadow-lg dark:border-surface-700 dark:bg-surface-900">
          {cities.map((city) => {
            const isSelected = activeLocation === city;
            return (
              <button
                key={city}
                type="button"
                onClick={() => select(isSelected ? "" : city)}
                aria-pressed={isSelected}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-body-sm transition-colors ${
                  isSelected
                    ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-950 dark:text-brand-400"
                    : "text-surface-600 hover:bg-surface-50 dark:text-surface-400 dark:hover:bg-surface-800"
                }`}
              >
                <span className="min-w-0 flex-1 truncate">{city}</span>
                {isSelected && (
                  <Check className="h-3.5 w-3.5 shrink-0 text-brand-600 dark:text-brand-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
