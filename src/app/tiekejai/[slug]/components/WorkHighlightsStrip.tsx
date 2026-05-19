"use client";

import { useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface WorkHighlightsStripProps {
  images: string[];
  providerName: string;
}

export default function WorkHighlightsStrip({ images, providerName }: WorkHighlightsStripProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Show up to 5 highlight circles
  const highlights = images.slice(0, 5);
  if (highlights.length === 0) return null;

  function open(index: number) {
    setActiveIndex(index);
    setViewerOpen(true);
  }

  function goNext() {
    setActiveIndex((i) => (i + 1) % images.length);
  }

  function goPrev() {
    setActiveIndex((i) => (i - 1 + images.length) % images.length);
  }

  return (
    <>
      <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
        {highlights.map((img, i) => (
          <button
            key={`${img}-${i}`}
            type="button"
            onClick={() => open(i)}
            className="group flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="rounded-full bg-gradient-to-tr from-brand-500 via-violet-500 to-amber-400 p-[2.5px] transition-transform group-hover:scale-105">
              <div className="h-16 w-16 overflow-hidden rounded-full border-[2.5px] border-white dark:border-surface-900">
                <Image
                  src={img}
                  alt={`${providerName} darbas ${i + 1}`}
                  width={64}
                  height={64}
                  quality={80}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
            <span className="text-[10px] font-medium text-surface-500 dark:text-surface-400 max-w-[64px] truncate">
              Darbas {i + 1}
            </span>
          </button>
        ))}

        {images.length > 5 && (
          <button
            type="button"
            onClick={() => open(5)}
            className="flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="flex h-[69px] w-[69px] items-center justify-center rounded-full bg-surface-100 dark:bg-surface-800">
              <span className="text-body-sm font-semibold text-surface-500 dark:text-surface-400">
                +{images.length - 5}
              </span>
            </div>
            <span className="text-[10px] font-medium text-surface-500 dark:text-surface-400">
              Daugiau
            </span>
          </button>
        )}
      </div>

      {/* Fullscreen viewer */}
      {viewerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90">
          <button
            onClick={() => setViewerOpen(false)}
            className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
            aria-label="Uždaryti"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                aria-label="Ankstesnis"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={goNext}
                className="absolute right-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
                aria-label="Kitas"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Progress dots */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full transition-all ${
                  i === activeIndex
                    ? "w-6 bg-white"
                    : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>

          <div className="relative max-h-[85vh] max-w-[90vw]">
            <Image
              src={images[activeIndex]}
              alt={`${providerName} darbas ${activeIndex + 1}`}
              width={900}
              height={700}
              quality={90}
              className="max-h-[85vh] w-auto rounded-2xl object-contain"
            />
          </div>

          <p className="absolute bottom-6 left-1/2 -translate-x-1/2 text-body-sm text-white/70">
            {activeIndex + 1} / {images.length}
          </p>
        </div>
      )}
    </>
  );
}
