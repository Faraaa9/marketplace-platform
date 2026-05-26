"use client";

import { useState } from "react";
import Image from "next/image";
import StoryViewer from "./StoryViewer";
import type { StoryData } from "./types";
import { useUIStore } from "@/store/useUIStore";

interface StoryAvatarButtonProps {
  stories: StoryData[];
  providerName: string;
  providerImage: string | null;
  isOnline?: boolean;
}

export default function StoryAvatarButton({
  stories,
  providerName,
  providerImage,
  isOnline = false,
}: StoryAvatarButtonProps) {
  const isStoryOpen = useUIStore((s) => s.isStoryOpen);
  const openStory = useUIStore((s) => s.openStory);
  const closeStory = useUIStore((s) => s.closeStory);
  const [storyIndex, setStoryIndex] = useState(0);
  const hasStories = stories.length > 0;

  return (
    <>
      <div className="relative [--presence-cutout-bg:#fff] dark:[--presence-cutout-bg:#25221e]">
        <button
          type="button"
          onClick={() => {
            if (!hasStories) return;
            setStoryIndex(0);
            openStory(stories[0]?.id ?? null);
          }}
          className={`relative h-[70px] w-[70px] shrink-0 rounded-full transition-all sm:h-[78px] sm:w-[78px] ${
            hasStories
              ? "cursor-pointer story-ring hover:scale-[1.03]"
              : "cursor-default"
          }`}
          disabled={!hasStories}
          aria-label={hasStories ? "Peržiūrėti tiekėjo story" : providerName}
        >
          <div
            className={`absolute flex items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-brand-100 dark:from-brand-950 dark:to-surface-800 ${
              hasStories ? "inset-[3px]" : "inset-0"
            }`}
          >
            {providerImage ? (
              <Image
                src={providerImage}
                alt={providerName}
                width={80}
                height={80}
                priority
                sizes="(max-width: 640px) 64px, 72px"
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-brand-700 sm:text-3xl dark:text-brand-300">
                {providerName[0].toUpperCase()}
              </span>
            )}
          </div>
        </button>
        {isOnline && (
          <span
            className="pointer-events-none absolute bottom-[4px] right-[4px] flex h-[19px] w-[19px] items-center justify-center rounded-full bg-[var(--presence-cutout-bg)] sm:h-[23px] sm:w-[23px]"
            aria-label="Prisijungęs dabar"
            title="Prisijungęs dabar"
          >
            <span className="h-[10px] w-[10px] rounded-full bg-emerald-500 sm:h-[13px] sm:w-[13px]" aria-hidden />
          </span>
        )}
      </div>

      {isStoryOpen && hasStories && (
        <StoryViewer
          stories={stories}
          index={storyIndex}
          providerName={providerName}
          providerImage={providerImage}
          onClose={closeStory}
          onIndexChange={setStoryIndex}
        />
      )}
    </>
  );
}
