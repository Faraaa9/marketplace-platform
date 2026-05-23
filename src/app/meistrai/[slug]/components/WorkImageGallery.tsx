"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface WorkImageGalleryProps {
  images: string[];
  providerName: string;
}

export default function WorkImageGallery({
  images,
  providerName,
}: WorkImageGalleryProps) {
  const [viewerOpen, setViewerOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // Show up to 5 highlight circles, then "more" if there are extras
  const highlights = images.slice(0, 5);
  const masonry = images.slice(1); // skip the first (it's the profile/hero image)

  // Keyboard navigation
  useEffect(() => {
    if (!viewerOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setViewerOpen(false);
      if (e.key === "ArrowLeft")
        setActiveIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === "ArrowRight")
        setActiveIndex((i) => (i + 1) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewerOpen, images.length]);

  if (images.length === 0) return null;

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
      {/* Circle strip */}
      <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
        {highlights.map((img, i) => (
          <button
            key={`hl-${img}-${i}`}
            type="button"
            onClick={() => open(i)}
            className="group flex shrink-0 flex-col items-center gap-1.5"
          >
            <div className="h-16 w-16 overflow-hidden rounded-full ring-2 ring-brand-500/80 ring-offset-2 ring-offset-white dark:ring-offset-surface-900 transition-transform group-hover:scale-105">
              <Image
                src={img}
                alt={`${providerName} darbas ${i + 1}`}
                width={64}
                height={64}
                quality={80}
                className="h-full w-full object-cover"
              />
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

      {/* Masonry "Darbų pavyzdžiai" (skip the first/hero image) */}
      {masonry.length > 0 && (
        <>
          <h2 className="mt-6 mb-4 text-heading-3 font-semibold text-surface-900 dark:text-white">
            Darbų pavyzdžiai
          </h2>
          <div className="columns-2 sm:columns-3 gap-3 space-y-3">
            {masonry.map((img, i) => (
              <button
                key={`m-${img}-${i}`}
                type="button"
                onClick={() => open(i + 1)}
                className="break-inside-avoid block w-full overflow-hidden rounded-2xl bg-surface-100 dark:bg-surface-800 cursor-zoom-in group"
              >
                <Image
                  src={img}
                  alt={`${providerName} darbas ${i + 2}`}
                  width={400}
                  height={i % 3 === 0 ? 500 : i % 3 === 1 ? 300 : 400}
                  quality={90}
                  sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, 220px"
                  className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </button>
            ))}
          </div>
        </>
      )}

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
                  i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>

          {/* Image — unoptimized to show actual source resolution */}
          <div className="relative flex max-h-[90vh] max-w-[95vw] items-center justify-center p-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={images[activeIndex]}
              alt={`${providerName} darbas ${activeIndex + 1}`}
              className="max-h-[85vh] max-w-[90vw] rounded-2xl object-contain"
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
