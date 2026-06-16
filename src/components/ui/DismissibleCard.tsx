"use client";

import { useCallback, useSyncExternalStore } from "react";
import { X } from "lucide-react";

const STORAGE_PREFIX = "pr-dismissed-card:";

// Shared store so dismissing one card re-renders it immediately (the native
// `storage` event only fires in *other* tabs, not the one that wrote the value).
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function persistDismiss(storageKey: string) {
  try {
    window.localStorage.setItem(storageKey, "1");
  } catch {
    // Private mode / quota — listeners still fire so the card hides this session.
  }
  listeners.forEach((l) => l());
}

/**
 * Wraps a one-off card (onboarding nudge, promo, announcement) and gives it an
 * X that remembers the dismissal in localStorage. Per-device only, no DB — this
 * is for cards you can lose without consequence, NOT for action prompts the user
 * needs to see (profile/credits/visibility). Pass a stable `id` per card.
 */
export function DismissibleCard({
  id,
  children,
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
}) {
  const storageKey = STORAGE_PREFIX + id;

  const getSnapshot = useCallback(() => {
    try {
      return window.localStorage.getItem(storageKey) === "1";
    } catch {
      return false;
    }
  }, [storageKey]);

  // Server + first hydration render return null ("not yet known") so an already
  // dismissed card never flashes in; the client then resolves synchronously. The
  // trade-off is a small pop-in for users who haven't dismissed it.
  const dismissed = useSyncExternalStore(subscribe, getSnapshot, () => null);

  if (dismissed === null || dismissed) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => persistDismiss(storageKey)}
        aria-label="Uždaryti"
        className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full text-[#8D857B] transition-colors hover:bg-[#F1EEE8] hover:text-[#24211D] dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
