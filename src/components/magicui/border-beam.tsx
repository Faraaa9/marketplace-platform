"use client";

import { cn } from "@/lib/utils";

interface BorderBeamProps {
  className?: string;
  size?: number;
  duration?: number;
  delay?: number;
  color?: string;
}

export function BorderBeam({
  className,
  size = 200,
  duration = 6,
  delay = 0,
  color = "#C25E3A",
}: BorderBeamProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 rounded-[inherit]",
        className
      )}
      style={{
        maskImage: `linear-gradient(transparent, transparent), linear-gradient(#fff, #fff)`,
        maskClip: "padding-box, border-box",
        maskComposite: "intersect",
        WebkitMaskImage: `linear-gradient(transparent, transparent), linear-gradient(#fff, #fff)`,
        WebkitMaskClip: "padding-box, border-box",
        WebkitMaskComposite: "xor",
        border: "1px solid transparent",
      }}
    >
      <div
        className="absolute animate-border-beam"
        style={{
          width: size,
          height: size,
          background: `radial-gradient(${size / 2}px circle, ${color}, transparent 70%)`,
          animationDuration: `${duration}s`,
          animationDelay: `${delay}s`,
          top: "-50%",
        }}
      />
    </div>
  );
}
