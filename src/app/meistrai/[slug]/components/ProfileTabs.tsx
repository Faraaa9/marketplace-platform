"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

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
 *
 * Deep-linkable: `?tab=<id>` or a `#<id>` hash (e.g. an external "#atsiliepimai"
 * link) activates the matching tab. Arrow/Home/End keys move between tabs.
 */
export default function ProfileTabs({ hero, panels, defaultTab }: ProfileTabsProps) {
  const [active, setActive] = useState(defaultTab ?? panels[0]?.id);
  const tablistRef = useRef<HTMLDivElement>(null);
  const panelIds = panels.map((p) => p.id).join(",");

  // Resolve the tab from the URL on the client (kept out of the SSR render to
  // avoid a hydration mismatch) and keep following hash changes so existing
  // "#atsiliepimai" links elsewhere in the app switch the tab.
  useEffect(() => {
    const ids = panelIds.split(",");
    const syncFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get("tab") || window.location.hash.slice(1);
      if (fromUrl && ids.includes(fromUrl)) setActive(fromUrl);
    };
    syncFromUrl();
    window.addEventListener("hashchange", syncFromUrl);
    return () => window.removeEventListener("hashchange", syncFromUrl);
  }, [panelIds]);

  function selectTab(id: string) {
    setActive(id);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", id);
    window.history.replaceState(null, "", url);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = panels.findIndex((p) => p.id === active);
    let next = idx;
    if (e.key === "ArrowRight") next = (idx + 1) % panels.length;
    else if (e.key === "ArrowLeft") next = (idx - 1 + panels.length) % panels.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = panels.length - 1;
    else return;
    e.preventDefault();
    selectTab(panels[next].id);
    tablistRef.current
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      [next]?.focus();
  }

  return (
    <>
      <div className="overflow-hidden rounded-3xl border border-surface-100 bg-white dark:border-surface-800 dark:bg-surface-900">
        {hero}
        <div className="border-t border-surface-100 p-3.5 dark:border-surface-800">
          <div
            ref={tablistRef}
            role="tablist"
            aria-label="Profilio sekcijos"
            onKeyDown={onKeyDown}
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
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => selectTab(panel.id)}
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
            aria-label={panel.label}
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
