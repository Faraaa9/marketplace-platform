"use client";

import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";

/** Transient "published" confirmation: pops in after the redirect from
 *  /uzklausos/nauja and removes itself after ~2.5s. Also strips `?created=1`
 *  from the URL so a reload or share doesn't replay the toast. */
export default function CreatedToast() {
  const [leaving, setLeaving] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.delete("created");
    window.history.replaceState(null, "", url.toString());

    const leaveTimer = setTimeout(() => setLeaving(true), 2200);
    const goneTimer = setTimeout(() => setGone(true), 2700);
    return () => {
      clearTimeout(leaveTimer);
      clearTimeout(goneTimer);
    };
  }, []);

  if (gone) return null;

  return (
    <div
      role="status"
      className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-surface-200/60 bg-white px-4 py-2.5 shadow-card transition-opacity duration-500 dark:border-surface-700/50 dark:bg-surface-900 ${
        leaving ? "opacity-0" : "opacity-100"
      }`}
    >
      <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span className="text-body-sm font-medium text-surface-900 dark:text-surface-100">
        Užklausa paskelbta
      </span>
    </div>
  );
}
