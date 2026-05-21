"use client";

import { useState, useEffect } from "react";
import { Sun, Moon } from "lucide-react";

/**
 * Light/dark theme switch. The source of truth is the `dark` class on
 * <html> (applied pre-paint by the inline script in layout.tsx); this
 * button flips it and persists the choice to localStorage.
 */
export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("theme", next ? "dark" : "light");
    } catch {
      /* storage unavailable — the in-page toggle still works for this visit */
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Įjungti šviesų režimą" : "Įjungti tamsų režimą"}
      className="rounded-lg p-2 text-[#57534C] transition-colors hover:bg-[#E2DDD2] dark:text-surface-300 dark:hover:bg-surface-800"
    >
      {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
    </button>
  );
}
