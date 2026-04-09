"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface MagicCardProps {
  children: ReactNode;
  className?: string;
  gradientColor?: string;
  gradientOpacity?: number;
}

export function MagicCard({
  children,
  className,
  gradientColor = "rgba(99, 102, 241, 0.08)",
  gradientOpacity = 1,
}: MagicCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(gradientOpacity)}
      onMouseLeave={() => setOpacity(0)}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-surface-200/60 bg-white transition-shadow duration-300 hover:shadow-elevated dark:border-surface-700/50 dark:bg-surface-900",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500"
        style={{
          opacity,
          background: `radial-gradient(400px circle at ${position.x}px ${position.y}px, ${gradientColor}, transparent 60%)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
}
