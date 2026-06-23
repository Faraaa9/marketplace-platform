"use client";

import { useState, type ReactNode } from "react";

export interface TabPanel {
  id: string;
  label: string;
  content: ReactNode;
}

interface ProfileTabsProps {
  /** Server-rendered hero content (cover + name + trust strip). */
  hero: ReactNode;
  panels: TabPanel[];
  defaultTab?: string;
}

/**
 * Thin client island. Receives already-server-rendered nodes as props (`hero`
 * + each panel's `content`), so the page stays a Server Component under PPR and
 * no provider data is serialized across the boundary. The segmented control is
 * merged into the bottom of the hero card; only the active panel is shown
 * (siblings stay mounted via `hidden`, preserving Suspense streaming).
 */
export default function ProfileTabs({ hero, panels, defaultTab }: ProfileTabsProps) {
  const [active, setActive] = useState(defaultTab ?? panels[0]?.id);

  return (
    <>
      <div className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_2px_rgba(28,26,24,0.04),0_8px_30px_rgba(28,26,24,0.06)] dark:bg-surface-900">
        {hero}
        <div className="border-t border-surface-100 p-3.5 dark:border-surface-800">
          <div
            role="tablist"
            aria-label="Profilio sekcijos"
            className="flex gap-1.5 rounded-2xl bg-surface-50 p-1.5 dark:bg-surface-800/50"
          >
            {panels.map((panel) => {
              const isActive = active === panel.id;
              return (
                <button
                  key={panel.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${panel.id}`}
                  onClick={() => setActive(panel.id)}
                  className={`flex-1 rounded-xl px-3 py-2.5 text-body-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-white text-surface-900 shadow-sm dark:bg-surface-900 dark:text-white"
                      : "text-surface-500 hover:text-surface-800 dark:text-surface-400 dark:hover:text-surface-200"
                  }`}
                >
                  {panel.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {panels.map((panel) => {
        const isActive = active === panel.id;
        return (
          <div
            key={panel.id}
            id={`panel-${panel.id}`}
            role="tabpanel"
            hidden={!isActive}
            className={isActive ? "mt-6 space-y-6 motion-safe:animate-fade-in" : undefined}
          >
            {panel.content}
          </div>
        );
      })}
    </>
  );
}
