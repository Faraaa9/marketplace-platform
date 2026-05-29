"use client";

import { useCallback, useEffect } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Send, X } from "lucide-react";
import type { StoryData } from "./types";
import StoryEngagementBar from "@/components/stories/StoryEngagementBar";
import {
  useStoryEngagement,
  useStoryPlayer,
} from "@/components/stories/story-viewer-hooks";

interface StoryViewerProps {
  stories: StoryData[];
  index: number;
  providerName: string;
  providerImage: string | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
  /** Opens the profile's inquiry form. Omitted on the provider's own profile. */
  onContact?: () => void;
}

const STORY_DURATION = 6000;

export default function StoryViewer({
  stories,
  index,
  providerName,
  providerImage,
  onClose,
  onIndexChange,
  onContact,
}: StoryViewerProps) {
  const story = stories[index];
  const hasNext = index < stories.length - 1;
  const hasPrev = index > 0;

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const advance = useCallback(() => {
    if (index < stories.length - 1) onIndexChange(index + 1);
    else onClose();
  }, [index, stories.length, onIndexChange, onClose]);

  const retreat = useCallback(() => {
    if (index > 0) onIndexChange(index - 1);
  }, [index, onIndexChange]);

  const { myReaction, react } = useStoryEngagement(story?.id);
  const { paused, pointerHandlers } = useStoryPlayer({
    duration: STORY_DURATION,
    onAdvance: advance,
    onRetreat: retreat,
    resetKey: index,
  });

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft") retreat();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [advance, retreat, onClose]);

  function timeAgo(dateStr: string) {
    // eslint-disable-next-line react-hooks/purity
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${Math.max(1, mins)} min.`;
    return `${Math.floor(mins / 60)} val.`;
  }

  if (!story) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={onClose}>
      <div
        className="relative mx-4 flex w-full max-w-md flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex gap-1 px-1">
          {stories.map((s, i) => (
            <div key={s.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full rounded-full bg-white"
                style={
                  i < index
                    ? { width: "100%" }
                    : i === index
                      ? {
                          animation: `story-progress ${STORY_DURATION}ms linear forwards`,
                          animationPlayState: paused ? "paused" : "running",
                        }
                      : { width: "0%" }
                }
              />
            </div>
          ))}
        </div>

        <div className="mb-3 flex items-center gap-2.5 px-1">
          <div className="relative flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/50">
            {providerImage ? (
              <Image
                src={providerImage}
                alt={providerName}
                fill
                sizes="32px"
                className="object-cover"
              />
            ) : (
              <span className="text-xs font-bold text-brand-600">
                {providerName[0].toUpperCase()}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{providerName}</p>
            <p className="text-xs text-white/60">{timeAgo(story.createdAt)}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Uždaryti story"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Story image — tap zones / hold-to-pause / swipe handled here */}
        <div
          className="relative aspect-[9/16] max-h-[70vh] touch-none select-none overflow-hidden rounded-2xl bg-surface-900"
          {...pointerHandlers}
        >
          <Image
            src={story.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 448px"
            className="pointer-events-none object-cover"
          />

          {story.text && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
              <p className="text-sm leading-relaxed text-white">{story.text}</p>
            </div>
          )}

          {hasPrev && (
            <div className="pointer-events-none absolute inset-y-0 left-0 flex w-1/3 items-center justify-start pl-2">
              <ChevronLeft className="h-8 w-8 text-white/40 drop-shadow" />
            </div>
          )}
          {hasNext && (
            <div className="pointer-events-none absolute inset-y-0 right-0 flex w-1/3 items-center justify-end pr-2">
              <ChevronRight className="h-8 w-8 text-white/40 drop-shadow" />
            </div>
          )}
        </div>

        <StoryEngagementBar
          myReaction={myReaction}
          onReact={react}
          contact={
            onContact ? (
              <button
                type="button"
                onClick={onContact}
                className="flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
              >
                <Send className="h-4 w-4" />
                Susisiekti
              </button>
            ) : undefined
          }
        />
      </div>
    </div>
  );
}
