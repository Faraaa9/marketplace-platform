"use client";

import { useEffect, useState } from "react";
import { FlaskConical, X } from "lucide-react";

const STORAGE_KEY = "test-version-banner-dismissed";

// Site-wide notice that paslaugurinka.lt is still a pre-production test build.
// Encourages testers to post listings, message, and even spam freely since no
// data here is real. Dismissal persists in localStorage so returning testers
// who already got the message aren't nagged on every page.
export default function TestVersionBanner() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "1") {
      setDismissed(true);
    }
  }, []);

  if (dismissed) return null;

  function handleDismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="border-b border-brand-200/60 bg-brand-50/70 dark:border-brand-800/40 dark:bg-brand-950/40">
      <div className="mx-auto flex max-w-7xl items-start gap-3 px-5 py-2.5 sm:items-center sm:px-8">
        <FlaskConical
          aria-hidden
          className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400 sm:mt-0"
        />
        <p className="flex-1 text-micro leading-snug text-surface-700 dark:text-surface-300 sm:text-body-sm">
          <span className="font-semibold text-surface-900 dark:text-white">
            Testinė versija.
          </span>{" "}
          Drąsiai bandykit - dėkite skelbimus, rašykit, spaudykit, net
          spaminkit. Nieko tikro čia nėra, viskas tik bandymams. Iki realaus
          paleidimo dar toli.
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Uždaryti"
          className="shrink-0 rounded-lg p-1 text-surface-400 transition-colors hover:bg-surface-200/50 hover:text-surface-600 dark:hover:bg-surface-800/50 dark:hover:text-surface-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
