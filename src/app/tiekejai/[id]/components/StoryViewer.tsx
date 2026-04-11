"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { StoryData } from "./types";

interface StoryViewerProps {
  stories: StoryData[];
  index: number;
  providerName: string;
  providerImage: string | null;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export default function StoryViewer({
  stories,
  index,
  providerName,
  providerImage,
  onClose,
  onIndexChange,
}: StoryViewerProps) {
  const story = stories[index];
  const hasNext = index < stories.length - 1;
  const hasPrev = index > 0;
  const touchStartX = useRef(0);

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (hasNext) onIndexChange(index + 1);
      else onClose();
    }, 6000);
    return () => clearTimeout(timer);
  }, [index, hasNext, onClose, onIndexChange]);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && hasNext) onIndexChange(index + 1);
      if (e.key === "ArrowLeft" && hasPrev) onIndexChange(index - 1);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, hasNext, hasPrev, onClose, onIndexChange]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) <= 50) return;
    if (diff > 0 && hasNext) onIndexChange(index + 1);
    if (diff < 0 && hasPrev) onIndexChange(index - 1);
  }

  function timeAgo(dateStr: string) {
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
                      ? { animation: "story-progress 6s linear forwards" }
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

        <div
          className="relative aspect-[9/16] max-h-[70vh] overflow-hidden rounded-2xl bg-surface-900"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Image
            src={story.imageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, 448px"
            className="object-cover"
          />

          {story.text && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-4">
              <p className="text-sm leading-relaxed text-white">{story.text}</p>
            </div>
          )}

          {hasPrev && (
            <button
              onClick={() => onIndexChange(index - 1)}
              className="absolute inset-y-0 left-0 flex w-1/3 items-center justify-start pl-2"
              aria-label="Ankstesnė story"
            >
              <ChevronLeft className="h-8 w-8 text-white/50 drop-shadow transition-colors hover:text-white/90" />
            </button>
          )}
          {hasNext && (
            <button
              onClick={() => onIndexChange(index + 1)}
              className="absolute inset-y-0 right-0 flex w-1/3 items-center justify-end pr-2"
              aria-label="Kita story"
            >
              <ChevronRight className="h-8 w-8 text-white/50 drop-shadow transition-colors hover:text-white/90" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
