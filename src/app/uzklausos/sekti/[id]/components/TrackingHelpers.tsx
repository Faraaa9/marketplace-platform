"use client";

import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-body-sm font-medium transition-colors",
        active
          ? "bg-brand-600 text-white"
          : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700",
      )}
    >
      {children}
    </button>
  );
}

export function BookmarkReminder() {
  const { data: session } = useSession();
  if (session) return null;

  return (
    <div className="mb-6 rounded-xl bg-surface-50 border border-surface-200/60 px-4 py-3 dark:bg-surface-800/50 dark:border-surface-700/50">
      <p className="text-micro text-surface-500 dark:text-surface-400">
        <span className="font-medium text-surface-600 dark:text-surface-300">Patarimas:</span>{" "}
        Išsaugokite šį puslapį (bookmark), kad lengvai sugrįžtumėte prie savo užklausos.
      </p>
    </div>
  );
}
