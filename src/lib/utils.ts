import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("lt-LT", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ką tik";
  if (diffMins < 60) return `Prieš ${diffMins} min.`;
  if (diffHours < 24) return `Prieš ${diffHours} val.`;
  if (diffDays < 7) return `Prieš ${diffDays} d.`;
  return formatDate(d);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + "...";
}

/**
 * Lithuanian plural form of "kreditas" (credit) for a given count.
 * 1 → kreditas · 2-9 → kreditai · 0 and 10-20 → kreditų
 */
export function creditsLabel(n: number): string {
  const abs = Math.abs(Math.trunc(n)) % 100;
  const last = abs % 10;
  if (abs >= 11 && abs <= 19) return "kreditų";
  if (last === 1) return "kreditas";
  if (last >= 2 && last <= 9) return "kreditai";
  return "kreditų";
}
