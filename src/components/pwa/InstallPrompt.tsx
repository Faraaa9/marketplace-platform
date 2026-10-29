"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
      if (Date.now() - dismissedAt < DISMISS_TTL) return;
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  if (!visible || !deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "dismissed") {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setVisible(false);
    setDeferred(null);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-2xl bg-white p-4 shadow-2xl ring-1 ring-black/10 dark:bg-surface-900 dark:ring-white/10">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute right-2 top-2 rounded-lg p-1 text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800"
        aria-label="Uždaryti"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950 dark:text-brand-400">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-body-sm font-semibold text-surface-900 dark:text-white">
            Įdiekite Paslaugų rinką
          </p>
          <p className="mt-0.5 text-micro text-surface-500 dark:text-surface-400">
            Greitas priėjimas, dirba ir be interneto. Be App Store.
          </p>
          <button
            type="button"
            onClick={handleInstall}
            className="mt-2 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-micro font-semibold text-white hover:bg-brand-700"
          >
            <Download className="h-3.5 w-3.5" />
            Įdiegti
          </button>
        </div>
      </div>
    </div>
  );
}
