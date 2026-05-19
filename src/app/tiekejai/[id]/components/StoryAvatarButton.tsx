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
}

export default function StoryAvatarButton({
  stories,
  providerName,
  providerImage,
}: StoryAvatarButtonProps) {
  const isStoryOpen = useUIStore((s) => s.isStoryOpen);
  const openStory = useUIStore((s) => s.openStory);
  const closeStory = useUIStore((s) => s.closeStory);
  const [storyIndex, setStoryIndex] = useState(0);
  const hasStories = stories.length > 0;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!hasStories) return;
          setStoryIndex(0);
          openStory(stories[0]?.id ?? null);
        }}
        className={`shrink-0 rounded-full p-[3px] transition-all ${
          hasStories
            ? "cursor-pointer bg-gradient-to-tr from-brand-500 via-violet-500 to-amber-400 hover:scale-105"
            : "cursor-default bg-transparent"
        }`}
        disabled={!hasStories}
        aria-label={hasStories ? "Peržiūrėti tiekėjo story" : providerName}
      >
        <div
          className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-brand-100 sm:h-20 sm:w-20 dark:from-brand-950 dark:to-surface-800 ${
            hasStories ? "ring-2 ring-white dark:ring-surface-900" : ""
          }`}
        >
          {providerImage ? (
            <Image
              src={providerImage}
              alt={providerName}
              width={80}
              height={80}
              priority
              sizes="(max-width: 640px) 64px, 80px"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-2xl font-bold text-brand-700 sm:text-3xl dark:text-brand-300">
              {providerName[0].toUpperCase()}
            </span>
          )}
        </div>
      </button>

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
