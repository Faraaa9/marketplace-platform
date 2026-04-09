"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  duration?: number;
}

export function Marquee({
  children,
  className,
  reverse = false,
  pauseOnHover = false,
  duration = 30,
}: MarqueeProps) {
  return (
    <div
      className={cn("group flex overflow-hidden [--gap:1rem]", className)}
    >
      {[0, 1].map((i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 gap-[--gap] animate-marquee",
            reverse && "[animation-direction:reverse]",
            pauseOnHover && "group-hover:[animation-play-state:paused]"
          )}
          style={{ animationDuration: `${duration}s` }}
          aria-hidden={i === 1}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
