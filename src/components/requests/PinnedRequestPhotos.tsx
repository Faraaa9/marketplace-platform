"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-image";

const TILTS = [-5, 3.5, -3, 4.5];
const MAX_SLOTS = 4;

interface PinnedRequestPhotosProps {
  urls: string[];
  title: string;
}

/**
 * Request attachment photos tacked to the board card like prints on a
 * corkboard. Thumbnails are tiny Cloudinary derivatives; the full-size
 * image is fetched only once the lightbox opens.
 */
export default function PinnedRequestPhotos({ urls, title }: PinnedRequestPhotosProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const total = urls.length;
  const open = openIndex !== null;

  const close = useCallback(() => setOpenIndex(null), []);
  const next = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i + 1) % total)),
    [total],
  );
  const prev = useCallback(
    () => setOpenIndex((i) => (i === null ? i : (i - 1 + total) % total)),
    [total],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close, next, prev]);

  if (total === 0) return null;

  const showAll = total <= MAX_SLOTS;
  const visibleCount = showAll ? total : MAX_SLOTS - 1;
  const overflow = total - visibleCount;

  return (
    <>
      <div className="polaroid-board">
        {urls.slice(0, visibleCount).map((url, i) => (
          <button
            key={url}
            type="button"
            onClick={() => setOpenIndex(i)}
            aria-label={`Peržiūrėti nuotrauką ${i + 1}`}
            className="polaroid"
            style={{ transform: `rotate(${TILTS[i % TILTS.length]}deg)` }}
          >
            <span aria-hidden className="pin polaroid__pin" />
            <span className="polaroid__photo">
              <Image
                src={optimizeCloudinaryUrl(url, { width: 240, height: 240, crop: "fill" })}
                alt={`${title} — nuotrauka ${i + 1}`}
                fill
                sizes="120px"
                className="object-cover"
              />
            </span>
          </button>
        ))}

        {!showAll && (
          <button
            type="button"
            onClick={() => setOpenIndex(visibleCount)}
            aria-label="Peržiūrėti visas nuotraukas"
            className="polaroid"
            style={{ transform: `rotate(${TILTS[visibleCount % TILTS.length]}deg)` }}
          >
            <span aria-hidden className="pin polaroid__pin" />
            <span className="polaroid__photo polaroid__photo--more font-serif">
              +{overflow}
            </span>
          </button>
        )}
      </div>

      {/* Portalled to <body>: an ancestor (.paper-note__shadow) sets a CSS
          filter, which would otherwise scope this fixed overlay to the card. */}
      {openIndex !== null &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Nuotraukų peržiūra"
            onClick={close}
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in"
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                close();
              }}
              aria-label="Uždaryti"
              className="absolute right-3 top-3 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20 sm:right-5 sm:top-5"
            >
              <X className="h-5 w-5" />
            </button>

            <div
              className="relative h-[80vh] w-full max-w-4xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={optimizeCloudinaryUrl(urls[openIndex], { width: 1400 })}
                alt={`${title} — nuotrauka ${openIndex + 1}`}
                fill
                sizes="(max-width: 920px) 92vw, 896px"
                className="object-contain"
                priority
              />
            </div>

            {total > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    prev();
                  }}
                  aria-label="Ankstesnė nuotrauka"
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:left-5"
                >
                  <ChevronLeft className="h-6 w-6" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    next();
                  }}
                  aria-label="Kita nuotrauka"
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-2.5 text-white transition-colors hover:bg-white/20 sm:right-5"
                >
                  <ChevronRight className="h-6 w-6" />
                </button>
                <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[0.8rem] font-medium text-white sm:bottom-6">
                  {openIndex + 1} / {total}
                </span>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}
