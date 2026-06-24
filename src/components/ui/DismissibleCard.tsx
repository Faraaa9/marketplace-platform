"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  DISMISSED_CARDS_COOKIE,
  DISMISSED_CARDS_MAX_AGE,
  parseDismissedCards,
  serializeDismissedCards,
} from "@/lib/dismissible-cards-shared";

function readCookie(name: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="))
    ?.slice(name.length + 1);
}

function persistDismiss(id: string) {
  const ids = parseDismissedCards(readCookie(DISMISSED_CARDS_COOKIE));
  ids.add(id);
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie =
    `${DISMISSED_CARDS_COOKIE}=${serializeDismissedCards(ids)}` +
    `; path=/; max-age=${DISMISSED_CARDS_MAX_AGE}; SameSite=Lax${secure}`;
}

/**
 * Wraps a one-off card (onboarding nudge, promo, announcement) and gives it an
 * X. The server gates the initial render via the dismissed-cards cookie (see
 * lib/dismissible-cards), so this component only mounts when the card should
 * show — clicking X hides it instantly and writes the cookie so it stays gone.
 *
 * Per-device (cookie), no DB. For dismissable cards only — never wrap action
 * prompts the user needs to see (profile/credits/visibility). Pass a stable
 * kebab-case `id`.
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
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setHidden(true);
          persistDismiss(id);
        }}
        aria-label="Uždaryti"
        className="absolute right-3 top-3 z-10 grid h-7 w-7 place-items-center rounded-full text-[#8D857B] transition-colors hover:bg-[#F1EEE8] hover:text-[#24211D] dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
      {children}
    </div>
  );
}
