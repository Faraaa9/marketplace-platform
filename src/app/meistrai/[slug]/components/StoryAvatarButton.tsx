"use client";

import { useState, useEffect } from "react";
import { Avatar } from "@/components/account/ui";
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
  const openMessageModal = useUIStore((s) => s.openMessageModal);
  const [storyIndex, setStoryIndex] = useState(0);
  const [seen, setSeen] = useState(false);
  const hasStories = stories.length > 0;
  const storyIdsKey = stories.map((s) => s.id).join(",");

  // Per-viewer seen-state can't live in the cached page render, so resolve it
  // client-side: grey the ring once every active story has been viewed.
  useEffect(() => {
    if (!storyIdsKey) return;
    let cancelled = false;
    const ids = storyIdsKey.split(",");
    fetch("/api/stories/seen-state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyIds: ids }),
    })
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res?.success) return;
        const seenSet = new Set<string>(res.seenIds ?? []);
        setSeen(ids.every((id) => seenSet.has(id)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storyIdsKey]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!hasStories) return;
          setStoryIndex(0);
          setSeen(true);
          openStory(stories[0]?.id ?? null);
        }}
        className={`relative block shrink-0 rounded-full transition-transform ${
          hasStories
            ? `cursor-pointer p-[3px] hover:scale-[1.03] ${seen ? "story-ring-seen" : "story-ring"}`
            : "cursor-default"
        }`}
        disabled={!hasStories}
        aria-label={hasStories ? "Peržiūrėti tiekėjo story" : providerName}
      >
        <Avatar
          name={providerName}
          image={providerImage}
          size={88}
          ring
          presence={isOnline ? "online" : null}
        />
      </button>

      {isStoryOpen && hasStories && (
        <StoryViewer
          stories={stories}
          index={storyIndex}
          providerName={providerName}
          providerImage={providerImage}
          onClose={closeStory}
          onIndexChange={setStoryIndex}
          onContact={() => {
            closeStory();
            openMessageModal();
          }}
        />
      )}
    </>
  );
}
