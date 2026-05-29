"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Send, X } from "lucide-react";
import StoryEngagementBar from "./StoryEngagementBar";
import { useStoryEngagement, useStoryPlayer } from "./story-viewer-hooks";

export interface StoryItem {
  id: string;
  imageUrl: string;
  text: string | null;
  createdAt: string;
}

export interface StoryProvider {
  providerId: string;
  providerName: string;
  providerImage: string | null;
  providerSlug: string;
  stories: StoryItem[];
  seen?: boolean;
}

interface MultiStoryViewerProps {
  providers: StoryProvider[];
  providerIndex: number;
  storyIndex: number;
  onClose: () => void;
  onChange: (providerIdx: number, storyIdx: number) => void;
}

const STORY_DURATION = 6000;

export default function MultiStoryViewer({
  providers,
  providerIndex,
  storyIndex,
  onClose,
  onChange,
}: MultiStoryViewerProps) {
  const provider = providers[providerIndex];
  const story = provider?.stories[storyIndex];
  const [mounted, setMounted] = useState(false);

  // Render into document.body via portal — avoids stacking/containing-block
  // issues from ancestors (e.g. sticky header, transforms).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Lock body scroll while viewer open
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  const advance = useCallback(() => {
    if (!provider) return;
    if (storyIndex < provider.stories.length - 1) {
      onChange(providerIndex, storyIndex + 1);
    } else if (providerIndex < providers.length - 1) {
      onChange(providerIndex + 1, 0);
    } else {
      onClose();
    }
  }, [provider, providerIndex, storyIndex, providers, onChange, onClose]);

  const retreat = useCallback(() => {
    if (storyIndex > 0) {
      onChange(providerIndex, storyIndex - 1);
    } else if (providerIndex > 0) {
      const prev = providers[providerIndex - 1];
      onChange(providerIndex - 1, prev.stories.length - 1);
    }
  }, [storyIndex, providerIndex, providers, onChange]);

  const { myReaction, react } = useStoryEngagement(story?.id);
  const { paused, pointerHandlers } = useStoryPlayer({
    duration: STORY_DURATION,
    onAdvance: advance,
    onRetreat: retreat,
    resetKey: `${providerIndex}:${storyIndex}`,
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") advance();
      if (e.key === "ArrowLeft") retreat();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance, retreat, onClose]);

  function timeAgo(dateStr: string) {
    // eslint-disable-next-line react-hooks/purity
    const ms = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${Math.max(1, mins)} min.`;
    return `${Math.floor(mins / 60)} val.`;
  }

  if (!provider || !story || !mounted) return null;

  const hasPrev = providerIndex > 0 || storyIndex > 0;
  const hasNext =
    providerIndex < providers.length - 1 ||
    storyIndex < provider.stories.length - 1;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex w-full max-w-md flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Story progress bars */}
        <div className="mb-3 flex gap-1 px-1">
          {provider.stories.map((s, i) => (
            <div
              key={s.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <div
                className="h-full rounded-full bg-white"
                style={
                  i < storyIndex
                    ? { width: "100%" }
                    : i === storyIndex
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

        {/* Header — clickable provider info */}
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <Link
            href={`/meistrai/${provider.providerSlug}`}
            className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity hover:opacity-90"
            onClick={onClose}
          >
            <div className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 dark:bg-brand-900/50">
              {provider.providerImage ? (
                <Image
                  src={provider.providerImage}
                  alt={provider.providerName}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                <span className="text-xs font-bold text-brand-600">
                  {provider.providerName[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">
                {provider.providerName}
              </p>
              <p className="text-xs text-white/60">
                {timeAgo(story.createdAt)} · spustelėk, kad pamatytum profilį
              </p>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Uždaryti"
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
            priority
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
            <Link
              href={`/meistrai/${provider.providerSlug}#zinute`}
              onClick={onClose}
              className="flex items-center justify-center gap-2 rounded-full bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              <Send className="h-4 w-4" />
              Susisiekti
            </Link>
          }
        />
      </div>
    </div>,
    document.body
  );
}
