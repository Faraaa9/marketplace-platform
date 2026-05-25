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
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            if (!hasStories) return;
            setStoryIndex(0);
            openStory(stories[0]?.id ?? null);
          }}
          className={`shrink-0 rounded-full transition-all ${
            hasStories
              ? "cursor-pointer p-[3px] bg-gradient-to-tr from-brand-700 via-brand-400 to-brand-600 bg-[length:200%_200%] animate-gradient hover:scale-[1.03]"
              : "cursor-default bg-transparent"
          }`}
          disabled={!hasStories}
          aria-label={hasStories ? "Peržiūrėti tiekėjo story" : providerName}
        >
          <div
            className={`relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-brand-50 to-brand-100 sm:h-[72px] sm:w-[72px] dark:from-brand-950 dark:to-surface-800 ${
              hasStories ? "ring-[1.5px] ring-white dark:ring-surface-900" : ""
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
            className="absolute bottom-0 right-0 block h-3.5 w-3.5 rounded-full bg-emerald-500 ring-2 ring-white sm:h-4 sm:w-4 dark:ring-surface-900"
            aria-label="Prisijungęs dabar"
            title="Prisijungęs dabar"
          />
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
