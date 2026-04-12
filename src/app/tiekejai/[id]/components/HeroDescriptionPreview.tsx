"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const CHAR_THRESHOLD = 450;

interface HeroDescriptionPreviewProps {
  description: string;
}

export default function HeroDescriptionPreview({ description }: HeroDescriptionPreviewProps) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(description.length > CHAR_THRESHOLD);
  const textRef = useRef<HTMLParagraphElement>(null);

  const measureOverflow = useCallback(() => {
    const el = textRef.current;
    if (!el || expanded) return;
    setCanExpand(el.scrollHeight > el.clientHeight + 2);
  }, [expanded]);

  useEffect(() => {
    measureOverflow();
    window.addEventListener("resize", measureOverflow);
    return () => window.removeEventListener("resize", measureOverflow);
  }, [measureOverflow, description]);

  // Short description — no clamp, no button, no fade
  if (!canExpand && !expanded) {
    return (
      <section className="mt-6 rounded-[1.75rem] bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:from-surface-900/80 dark:via-surface-900/60 dark:to-surface-800/50">
        <h2 className="mb-3 text-body-sm font-semibold text-slate-900 dark:text-white">
          Apie tiekėją
        </h2>
        <p
          ref={textRef}
          className="whitespace-pre-wrap text-body-sm leading-6 text-slate-600 dark:text-surface-400"
        >
          {description}
        </p>
      </section>
    );
  }

  // Long description — clamp + fade + button
  return (
    <section className="mt-6 rounded-[1.75rem] bg-gradient-to-br from-slate-50 via-white to-slate-50 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:from-surface-900/80 dark:via-surface-900/60 dark:to-surface-800/50">
      <h2 className="mb-3 text-body-sm font-semibold text-slate-900 dark:text-white">
        Apie tiekėją
      </h2>

      <div className="relative">
        <p
          ref={textRef}
          className={`whitespace-pre-wrap text-body-sm leading-6 text-slate-600 dark:text-surface-400 ${
            expanded ? "" : "line-clamp-[8]"
          }`}
        >
          {description}
        </p>

        {!expanded && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-surface-900 dark:via-surface-900/95" />
        )}

        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className={`inline-flex items-center gap-1.5 rounded-full border border-brand-200/70 bg-white/90 px-3.5 py-1.5 text-micro font-semibold text-brand-700 shadow-sm backdrop-blur-md transition-all hover:-translate-y-0.5 hover:border-brand-300 hover:bg-brand-50 hover:shadow-md dark:border-brand-400/30 dark:bg-surface-950/85 dark:text-brand-200 dark:hover:bg-surface-900 ${
            expanded ? "mt-3" : "absolute bottom-1 right-0"
          }`}
        >
          {expanded ? "Rodyti mažiau" : "Skaityti daugiau"}
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
    </section>
  );
}
