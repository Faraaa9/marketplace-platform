"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import MultiStoryViewer, {
  type StoryProvider,
} from "./MultiStoryViewer";

export default function GlobalStoriesStrip() {
  const [providers, setProviders] = useState<StoryProvider[]>([]);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [providerIndex, setProviderIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/stories/feed")
      .then((r) => r.json())
      .then((res) => {
        if (cancelled) return;
        if (res.success) setProviders(res.data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const hasStories = providers.length > 0;

  function openViewer(e: React.MouseEvent) {
    if (!hasStories) return;
    e.preventDefault();
    setProviderIndex(0);
    setStoryIndex(0);
    setViewerOpen(true);
  }

  const logoCircle = (
    <span
      className={`grid h-8 w-8 place-items-center rounded-full bg-[#C25E3A] text-[13px] font-bold text-white ${
        hasStories ? "ring-[1.5px] ring-white dark:ring-surface-900" : ""
      }`}
    >
      P
    </span>
  );

  return (
    <>
      {hasStories ? (
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openViewer}
            className="rounded-full p-[2px] bg-gradient-to-tr from-brand-700 via-brand-400 to-brand-600 bg-[length:200%_200%] animate-gradient transition-transform hover:scale-105"
            aria-label={`Žiūrėti ${providers.length} aktyvių story`}
          >
            {logoCircle}
          </button>
          <Link
            href="/"
            className="text-[17px] font-semibold tracking-tight text-[#26231F] dark:text-surface-50"
          >
            {APP_NAME}
          </Link>
        </div>
      ) : (
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          {logoCircle}
          <span className="text-[17px] font-semibold tracking-tight text-[#26231F] dark:text-surface-50">
            {APP_NAME}
          </span>
        </Link>
      )}

      {viewerOpen && hasStories && (
        <MultiStoryViewer
          providers={providers}
          providerIndex={providerIndex}
          storyIndex={storyIndex}
          onClose={() => setViewerOpen(false)}
          onChange={(pIdx, sIdx) => {
            setProviderIndex(pIdx);
            setStoryIndex(sIdx);
          }}
        />
      )}
    </>
  );
}
