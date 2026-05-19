"use client";

import { useEffect, useState } from "react";
import { Send, Euro } from "lucide-react";
import { useUIStore } from "@/store/useUIStore";

interface StickyBottomBarProps {
  priceFrom: number | null;
  providerName: string;
  isSelf: boolean;
}

export default function StickyBottomBar({ priceFrom, providerName, isSelf }: StickyBottomBarProps) {
  const [visible, setVisible] = useState(false);
  const openMessageModal = useUIStore((s) => s.openMessageModal);

  useEffect(() => {
    function onScroll() {
      // Show after scrolling 400px
      setVisible(window.scrollY > 400);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isSelf || !visible) return null;

  function handleContact() {
    openMessageModal();
    // Also navigate to the form via hash
    const el = document.getElementById("zinute");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    // Trigger hashchange so DirectInquiryWidget opens
    if (window.location.hash !== "#zinute") {
      window.location.hash = "#zinute";
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 md:hidden">
      {/* Gradient fade */}
      <div className="h-4 bg-gradient-to-t from-white dark:from-surface-950" />
      <div className="bg-white dark:bg-surface-900 border-t border-surface-200/50 dark:border-surface-800/50 px-4 py-3 safe-area-bottom">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-body-sm font-semibold text-surface-900 dark:text-white truncate">
              {providerName}
            </p>
            {priceFrom && priceFrom > 0 ? (
              <p className="flex items-center gap-1 text-body-sm text-emerald-600 dark:text-emerald-400">
                <Euro className="h-3.5 w-3.5" />
                Nuo {priceFrom} €
              </p>
            ) : (
              <p className="text-micro text-surface-400">Kaina derinama</p>
            )}
          </div>
          <button
            onClick={handleContact}
            className="flex h-11 shrink-0 items-center gap-2 rounded-xl bg-brand-600 px-5 text-body-sm font-medium text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.97] dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            <Send className="h-4 w-4" />
            Rašyti žinutę
          </button>
        </div>
      </div>
    </div>
  );
}
