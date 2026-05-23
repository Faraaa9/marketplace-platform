"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useAnimationControls } from "framer-motion";
import { Star, Quote } from "lucide-react";

export interface TestimonialData {
  id: string;
  rating: number;
  comment: string;
  clientName: string;
  category: string;
}

interface TestimonialMarqueeProps {
  testimonials: TestimonialData[];
}

export default function TestimonialMarquee({ testimonials }: TestimonialMarqueeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);
  const controls = useAnimationControls();
  const [contentWidth, setContentWidth] = useState(0);

  // We duplicate the list for seamless loop
  const items = [...testimonials, ...testimonials];

  useEffect(() => {
    if (!containerRef.current || testimonials.length === 0) return;
    // Measure first half (the original set)
    const children = containerRef.current.children;
    let totalWidth = 0;
    for (let i = 0; i < testimonials.length; i++) {
      const child = children[i] as HTMLElement;
      if (child) totalWidth += child.offsetWidth + 16; // gap-4 = 16px
    }
    setContentWidth(totalWidth);
  }, [testimonials]);

  useEffect(() => {
    if (contentWidth === 0) return;
    if (isPaused) {
      controls.stop();
      return;
    }

    controls.start({
      x: [-0, -contentWidth],
      transition: {
        x: {
          duration: testimonials.length * 6,
          ease: "linear",
          repeat: Infinity,
          repeatType: "loop",
        },
      },
    });
  }, [contentWidth, isPaused, controls, testimonials.length]);

  if (testimonials.length === 0) return null;

  return (
    <div
      className="overflow-hidden"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <motion.div
        ref={containerRef}
        animate={controls}
        className="flex gap-4 will-change-transform"
        style={{ width: "max-content" }}
      >
        {items.map((t, i) => (
          <TestimonialCard key={`${t.id}-${i}`} testimonial={t} />
        ))}
      </motion.div>
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: TestimonialData }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className="w-[300px] shrink-0 rounded-2xl bg-surface-50 p-5 dark:bg-surface-800/50 cursor-default select-none"
    >
      <Quote className="h-4 w-4 text-brand-300 dark:text-brand-700 mb-2" />
      <p className="text-body-sm leading-relaxed text-surface-600 dark:text-surface-400 line-clamp-4">
        "{testimonial.comment}"
      </p>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50">
            <span className="text-micro font-semibold text-brand-600 dark:text-brand-400">
              {testimonial.clientName[0].toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-micro font-medium text-surface-900 dark:text-white leading-tight">
              {testimonial.clientName}
            </p>
            <p className="text-[10px] text-surface-400">{testimonial.category}</p>
          </div>
        </div>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-3 w-3 ${
                star <= testimonial.rating
                  ? "fill-amber-400 text-amber-400"
                  : "text-surface-200 dark:text-surface-700"
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
