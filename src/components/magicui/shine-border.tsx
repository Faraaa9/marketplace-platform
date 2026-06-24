"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface ShineBorderProps {
  children: ReactNode;
  className?: string;
  borderWidth?: number;
  duration?: number;
  color?: string[];
}

export function ShineBorder({
  children,
  className,
  borderWidth = 1,
  duration = 8,
  color = ["#C25E3A", "#A94E2F", "#8A3F26"],
}: ShineBorderProps) {
  return (
    <div
      className={cn("relative overflow-hidden rounded-2xl", className)}
      style={{
        padding: borderWidth,
        background: `linear-gradient(var(--shine-angle, 0deg), ${color.join(", ")})`,
        animation: `shine-rotate ${duration}s linear infinite`,
      }}
    >
      <div className="relative rounded-[calc(1rem-1px)] bg-white dark:bg-surface-900 h-full">
        {children}
      </div>
    </div>
  );
}
