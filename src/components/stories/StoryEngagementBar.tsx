"use client";

import { STORY_REACTIONS } from "@/lib/stories/reactions";

/**
 * Reaction icons + an optional contact slot, shown under a story image. The
 * contact element differs per viewer (a link from the global strip, an inline
 * action on a profile), so it's passed in.
 */
export default function StoryEngagementBar({
  myReaction,
  onReact,
  contact,
}: {
  myReaction: string | null;
  onReact: (emoji: string) => void;
  contact?: React.ReactNode;
}) {
  return (
    <div className="mt-3 flex flex-col gap-2.5 px-1">
      <div className="flex items-center justify-center gap-1.5">
        {STORY_REACTIONS.map((r) => {
          const selected = myReaction === r.emoji;
          return (
            <button
              key={r.emoji}
              type="button"
              onClick={() => onReact(r.emoji)}
              aria-label={r.label}
              aria-pressed={selected}
              title={r.label}
              className={`flex h-11 w-11 items-center justify-center rounded-full text-xl leading-none transition-colors ${
                selected
                  ? "bg-white/25 ring-1 ring-inset ring-white/70"
                  : "bg-white/5 hover:bg-white/15"
              }`}
            >
              <span aria-hidden>{r.emoji}</span>
            </button>
          );
        })}
      </div>
      {contact}
    </div>
  );
}
