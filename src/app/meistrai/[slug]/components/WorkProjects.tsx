"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import type { WorkGallery, WorkProject } from "./types";

interface WorkProjectsProps {
  gallery: WorkGallery;
  providerName: string;
}

/**
 * Darbai panel matching public/profile-mockup.html: an optional before/after
 * slider, then a grid of project "folder" cards (cover + photo count + stacked
 * look) that open a lightbox gallery (prev/next, thumbnail strip, counter,
 * Esc/arrow keys, backdrop-close).
 */
export default function WorkProjects({ gallery, providerName }: WorkProjectsProps) {
  const { beforeAfter, projects } = gallery;
  const [pos, setPos] = useState(50);
  const [active, setActive] = useState<WorkProject | null>(null);
  const [index, setIndex] = useState(0);

  const photos = active?.photos ?? [];

  useEffect(() => {
    if (!active) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
      else if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + photos.length) % photos.length);
      else if (e.key === "ArrowRight") setIndex((i) => (i + 1) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, photos.length]);

  function openFolder(project: WorkProject) {
    setActive(project);
    setIndex(0);
  }

  if (!beforeAfter && projects.length === 0) {
    return (
      <div className="profile-card bg-white p-8 text-center dark:bg-surface-900/50">
        <ImageIcon className="mx-auto mb-3 h-8 w-8 text-surface-300" />
        <p className="text-body-sm text-surface-500 dark:text-surface-400">
          Darbų nuotraukų kol kas nėra.
        </p>
      </div>
    );
  }

  return (
    <>
      {beforeAfter && (
        <div className="profile-card bg-white p-6 dark:bg-surface-900/50 sm:p-8">
          <p className="mb-4 text-micro font-bold uppercase tracking-[0.04em] text-surface-400">
            Prieš ir po
          </p>
          <div className="relative aspect-[16/10] select-none overflow-hidden rounded-2xl bg-surface-100 dark:bg-surface-800">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={beforeAfter.before}
              alt={`${providerName} — prieš`}
              className="absolute inset-0 h-full w-full object-cover"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={beforeAfter.after}
              alt={`${providerName} — po`}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ clipPath: `inset(0 0 0 ${pos}%)` }}
            />
            <span className="absolute bottom-2.5 left-2.5 rounded-full bg-black/60 px-2.5 py-1 text-micro font-bold tracking-[0.04em] text-white backdrop-blur-sm">
              PRIEŠ
            </span>
            <span className="absolute bottom-2.5 right-2.5 rounded-full bg-brand-600 px-2.5 py-1 text-micro font-bold tracking-[0.04em] text-white backdrop-blur-sm">
              PO
            </span>
            <div
              className="pointer-events-none absolute inset-y-0 w-[3px] -translate-x-1/2 bg-white"
              style={{ left: `${pos}%` }}
            >
              <div className="absolute left-1/2 top-1/2 flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-surface-700 shadow-md">
                <ChevronLeft className="h-4 w-4" />
                <ChevronRight className="-ml-1 h-4 w-4" />
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={pos}
              onChange={(e) => setPos(Number(e.target.value))}
              aria-label="Prieš ir po slankiklis"
              className="absolute inset-0 m-0 h-full w-full cursor-ew-resize opacity-0"
            />
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="profile-card bg-white p-6 dark:bg-surface-900/50 sm:p-8">
          <p className="mb-4 text-micro font-bold uppercase tracking-[0.04em] text-surface-400">
            Projektai · paspausk ir peržiūrėk
          </p>
          <div className="grid grid-cols-2 gap-x-3.5 gap-y-4">
            {projects.map((project, p) => (
              <button
                key={`${project.name}-${p}`}
                type="button"
                onClick={() => openFolder(project)}
                className="group relative text-left"
              >
                <span className="relative block aspect-[4/3]">
                  {/* stacked-paper layers */}
                  <span className="absolute inset-0 translate-y-[9px] scale-[0.92] rounded-2xl border border-surface-100 bg-white opacity-50 shadow-sm dark:border-surface-800 dark:bg-surface-900" />
                  <span className="absolute inset-0 translate-y-[5px] scale-[0.96] rounded-2xl border border-surface-100 bg-white opacity-80 shadow-sm dark:border-surface-800 dark:bg-surface-900" />
                  <span className="relative block h-full w-full overflow-hidden rounded-2xl bg-surface-100 shadow-sm dark:bg-surface-800">
                    {project.photos[0] && (
                      <Image
                        src={project.photos[0]}
                        alt={project.name}
                        fill
                        sizes="(max-width: 768px) 50vw, 320px"
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    <span className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent to-[52%]" />
                    <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-micro font-semibold text-white backdrop-blur-sm">
                      <ImageIcon className="h-3 w-3" />
                      {project.photos.length}
                    </span>
                    <span className="absolute inset-x-3 bottom-2.5">
                      <span className="block text-body-sm font-bold leading-tight text-white">
                        {project.name}
                      </span>
                      {project.sub && (
                        <span className="block text-micro text-white/80">{project.sub}</span>
                      )}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      {active && photos.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/[0.94] p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActive(null);
          }}
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
            aria-label="Uždaryti"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="flex w-full max-w-[880px] flex-col items-center gap-3.5">
            <div className="relative w-full">
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
                    className="absolute -left-1.5 top-[40%] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
                    aria-label="Ankstesnė"
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndex((i) => (i + 1) % photos.length)}
                    className="absolute -right-1.5 top-[40%] z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white transition-colors hover:bg-white/30"
                    aria-label="Kita"
                  >
                    <ChevronRight className="h-6 w-6" />
                  </button>
                </>
              )}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photos[index]}
                alt={`${active.name} — ${index + 1}`}
                className="mx-auto max-h-[70vh] max-w-full rounded-2xl bg-black object-contain"
              />
            </div>
            <div className="text-center text-body-sm font-semibold text-white">
              {active.name}
              {active.sub && <span className="ml-2 font-medium text-white/60">{active.sub}</span>}
            </div>
            <div className="text-micro font-semibold tracking-[0.05em] text-white/60">
              {index + 1} / {photos.length}
            </div>
            {photos.length > 1 && (
              <div className="flex max-w-full flex-wrap justify-center gap-1.5">
                {photos.map((photo, i) => (
                  <button
                    key={`${photo}-${i}`}
                    type="button"
                    onClick={() => setIndex(i)}
                    className={`h-10 w-[52px] overflow-hidden rounded-md border-2 transition ${
                      i === index ? "border-white opacity-100" : "border-transparent opacity-50 hover:opacity-80"
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
