"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AnimatedGradientTextProps {
  children: ReactNode;
  className?: string;
}

export function AnimatedGradientText({ children, className }: AnimatedGradientTextProps) {
  return (
    <span
      className={cn(
        "animate-gradient bg-[length:200%_auto] bg-clip-text text-transparent",
        "bg-gradient-to-r from-brand-600 via-purple-500 to-brand-400",
        className
      )}
    >
      {children}
    </span>
  );
}
