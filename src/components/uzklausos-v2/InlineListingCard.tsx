"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Mic,
  X,
  ImagePlus,
  MapPin,
  Wallet,
  CalendarClock,
  Plus,
  Tag,
  ArrowRight,
} from "lucide-react";
import type { ServiceCategoryGroup } from "@/lib/service-categories";
import { LITHUANIAN_CITIES } from "@/lib/constants";
import GroupedCategoryPicker from "@/components/categories/GroupedCategoryPicker";
import MultilabelCategoryPicker, { type MlJob } from "@/components/uzklausos-v2/MultilabelCategoryPicker";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-image";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import { cn } from "@/lib/utils";

type MetaKey = "category" | "location" | "budget" | "deadline";

// Minimum description length before the dependent fields and the "Toliau"
// button unlock. Matches the server's improveDescriptionSchema (.min(15)) and
// the runAiImprove guard, so the button is enabled exactly when the AI call
// will accept the text — not a stricter word-count gate that froze normal requests.
const MIN_DESCRIPTION_CHARS = 15;

export interface SelectedCategory {
  id: string;
  label: string;
}

interface InlineListingCardProps {
  title: string;
  onTitleChange: (value: string) => void;

  description: string;
  onDescriptionChange: (value: string) => void;

  attachmentUrls: string[];
  onRemovePhoto: (url: string) => void;
  onUploadFiles: (files: File[]) => void | Promise<void>;
  photosUploading: boolean;
  photoError?: string;
  photoDragOver: boolean;
  /** Spread onto the paper sheet to enable drag-drop of photos anywhere on the card. */
  dropHandlers: React.HTMLAttributes<HTMLDivElement>;

  selectedCategories: SelectedCategory[];
  maxCategories: number;
  categoryGroups: ServiceCategoryGroup[];
  onAddCategory: (id: string) => void;
  onRemoveCategory: (id: string) => void;
  /** Phase A multi-label: when set, per-job suggestion UI replaces the chip row. */
  multilabelJobs?: MlJob[] | null;

  location: string;
  onLocationChange: (value: string) => void;

  budget: string;
  onBudgetChange: (value: string) => void;

  deadline: string;
  onDeadlineChange: (value: string) => void;

  titleError?: string;
  descriptionError?: string;
  showCategoryError?: boolean;

  /** Triggered when the user clicks the in-card "Toliau" button. */
  onTriggerAi: () => void;
  /** True while the AI improve request is in flight — disables the button. */
  aiRunning: boolean;
}

/** The editable v2 listing card, rendered in the paper-note aesthetic that
 *  providers see for published requests. Title, description, category, and
 *  meta values are all inline-editable: clicking opens an inline editor
 *  popover below the paper without taking the user away from the listing. */
export default function InlineListingCard({
  title,
  onTitleChange,
  description,
  onDescriptionChange,
  attachmentUrls,
  onRemovePhoto,
  onUploadFiles,
  photosUploading,
  photoError,
  photoDragOver,
  dropHandlers,
  selectedCategories,
  maxCategories,
  categoryGroups,
  onAddCategory,
  onRemoveCategory,
  multilabelJobs,
  location,
  onLocationChange,
  budget,
  onBudgetChange,
  deadline,
  onDeadlineChange,
  titleError,
  descriptionError,
  showCategoryError = false,
  onTriggerAi,
  aiRunning,
}: InlineListingCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const [openMeta, setOpenMeta] = useState<MetaKey | null>(null);

  const aiButtonUnlocked = useMemo(
    () => description.trim().length >= MIN_DESCRIPTION_CHARS,
    [description],
  );

  // Grow the description textarea to fit content.
  const resizeDescription = useCallback(() => {
    const el = descriptionRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 64)}px`;
  }, []);

  useEffect(() => {
    resizeDescription();
  }, [description, resizeDescription]);

  // Auto-focus the description on mount when empty so the user's eye lands
  // there and they start with the AI-driven flow (description → AI fills the rest).
  useEffect(() => {
    if (descriptionRef.current && description.trim().length === 0) {
      descriptionRef.current.focus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const appendTranscript = useCallback(
    (text: string) => {
      const base = description.trimEnd();
      onDescriptionChange((base ? `${base} ${text}` : text).slice(0, 2000));
    },
    [description, onDescriptionChange],
  );

  const {
    isSupported: micSupported,
    status: micStatus,
    error: micError,
    toggle: toggleMic,
  } = useVoiceRecorder({ onTranscript: appendTranscript });

  // Close the meta editor on outside click or Escape.
  useEffect(() => {
    if (!openMeta) return;
    function handleClick(e: MouseEvent) {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpenMeta(null);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMeta(null);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [openMeta]);

  function toggleMetaKey(key: MetaKey) {
    setOpenMeta((current) => (current === key ? null : key));
  }

  const hasCategory = selectedCategories.length > 0;
  const canAddMoreCategories = selectedCategories.length < maxCategories;
  const hasLocation = !!location.trim();
  const hasBudget = !!budget.trim();
  const hasDeadline = !!deadline.trim();

  // Until the user has typed a few words of description, lock the dependent
  // fields. The "AI will fill this" placeholders teach the user that they
  // only need to start with the description. Fields that already hold a
  // value (e.g. AI pre-filled them) stay editable so users can refine.
  const descriptionChars = description.trim().length;
  const descriptionStarted = descriptionChars >= MIN_DESCRIPTION_CHARS;
  const titleLocked = !descriptionStarted && title.trim().length === 0;
  const categoryLocked = !descriptionStarted && !hasCategory;
  const locationLocked = !descriptionStarted && !hasLocation;
  const budgetLocked = !descriptionStarted && !hasBudget;
  const deadlineLocked = !descriptionStarted && !hasDeadline;

  return (
    <article ref={rootRef} className="paper-note relative">
      <div className="paper-note__shadow">
        <div
          {...dropHandlers}
          className={cn(
            "paper-note__sheet px-6 pb-9 pt-11 sm:px-9",
            photoDragOver && "ring-2 ring-brand-400/60",
          )}
        >
          {/* ── Phase A multi-label picker OR the category tags row ── */}
          {multilabelJobs && multilabelJobs.length > 0 ? (
            <MultilabelCategoryPicker
              jobs={multilabelJobs}
              selectedIds={selectedCategories.map((c) => c.id)}
              onToggle={(id) =>
                selectedCategories.some((c) => c.id === id) ? onRemoveCategory(id) : onAddCategory(id)
              }
              onAddManual={() => toggleMetaKey("category")}
            />
          ) : (hasCategory || !categoryLocked) ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedCategories.map((cat) => (
                <span
                  key={cat.id}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-serif text-[0.78rem] font-medium transition-colors",
                    showCategoryError
                      ? "border border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-500/10 dark:text-red-300"
                      : "bg-[#ebe2cb] text-[#6f6042] ring-1 ring-inset ring-[#d3c6a2]/70 dark:bg-surface-800 dark:text-surface-300 dark:ring-surface-700",
                  )}
                >
                  <Tag className="h-3 w-3" />
                  <span className="max-w-[12rem] truncate">{cat.label || "Kategorija"}</span>
                  <button
                    type="button"
                    onClick={() => onRemoveCategory(cat.id)}
                    aria-label={`Pašalinti kategoriją ${cat.label || ""}`}
                    className="ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-full text-[#9b8a5f] transition-colors hover:bg-[#d8cda6] hover:text-[#6f6042] dark:text-surface-500 dark:hover:bg-surface-700 dark:hover:text-surface-200"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </span>
              ))}
              {canAddMoreCategories && (
                <button
                  type="button"
                  onClick={() => toggleMetaKey("category")}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-serif text-[0.78rem] font-medium transition-colors",
                    !hasCategory && !showCategoryError &&
                      "border border-dashed border-[#cdbe8f] text-[#9b8a5f] hover:bg-[#ebe2cb]/40 dark:border-surface-600 dark:text-surface-400 dark:hover:bg-surface-800/50",
                    hasCategory && !showCategoryError &&
                      "text-[#9b8a5f] hover:bg-[#ebe2cb]/40 hover:text-[#6f6042] dark:text-surface-400 dark:hover:bg-surface-800/50",
                    showCategoryError && !hasCategory &&
                      "border border-red-400 bg-red-50 text-red-700 dark:border-red-600 dark:bg-red-500/10 dark:text-red-300",
                    openMeta === "category" && "ring-2 ring-brand-400/60",
                  )}
                >
                  <Plus className="h-3 w-3" />
                  <span>{hasCategory ? "dar viena" : "kategorija"}</span>
                </button>
              )}
            </div>
          ) : null}

          {/* ── Title: static prompt until AI/user fills it, then inline input ── */}
          {titleLocked ? (
            <div className="mt-2">
              <h3 className="font-serif text-[1.5rem] font-semibold leading-snug text-surface-900 dark:text-white sm:text-[1.7rem]">
                Ko tau reikia?
              </h3>
              <p className="mt-0.5 text-body-sm text-surface-500 dark:text-surface-400">
                Aprašyk savais žodžiais - kas, kur ir kada.
              </p>
            </div>
          ) : (
            <div className="mt-3.5">
              <h3 className="min-w-0 font-serif text-[1.5rem] font-semibold leading-snug text-surface-900 dark:text-white sm:text-[1.7rem]">
                <input
                  aria-label="Skelbimo pavadinimas"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value.slice(0, 100))}
                  placeholder="Skelbimo pavadinimas"
                  className={cn(
                    "block w-full border-0 bg-transparent p-0 font-serif text-[1.5rem] font-semibold leading-snug text-surface-900 outline-none placeholder:text-surface-300 dark:text-white dark:placeholder:text-surface-600 sm:text-[1.7rem]",
                    titleError && "border-b border-red-400",
                  )}
                  maxLength={100}
                />
              </h3>
            </div>
          )}
          {titleError && (
            <p className="mt-1 text-micro text-red-500 dark:text-red-400">{titleError}</p>
          )}

          {/* ── Description (body paragraph styled, inline textarea) ── */}
          <div className="mt-2">
            <textarea
              ref={descriptionRef}
              aria-label="Skelbimo aprašymas"
              value={description}
              onChange={(e) => onDescriptionChange(e.target.value.slice(0, 2000))}
              onInput={resizeDescription}
              placeholder={
                micStatus === "recording"
                  ? "Klausau, kalbėk…"
                  : micStatus === "transcribing"
                    ? "Atpažįstu, ką pasakei…"
                    : "Pvz.: reikia perdažyti 60 m² butą Kaune, norėčiau pradėti kitą savaitę…"
              }
              rows={3}
              maxLength={2000}
              className={cn(
                "block w-full resize-none border-0 bg-transparent p-0 text-[0.92rem] leading-relaxed text-surface-600 outline-none placeholder:text-surface-300 dark:text-surface-300 dark:placeholder:text-surface-600",
                "whitespace-pre-wrap",
                descriptionError && "border-b border-red-400",
              )}
            />
          </div>
          {descriptionError && (
            <p className="mt-1 text-micro text-red-500 dark:text-red-400">{descriptionError}</p>
          )}
          {micError && (
            <p role="alert" className="mt-1 text-micro text-red-600 dark:text-red-400">
              {micError === "denied"
                ? "Mikrofonas užblokuotas. Leisk jį naršyklės nustatymuose."
                : micError === "unavailable"
                  ? "Mikrofonas nepasiekiamas."
                  : "Nepavyko atpažinti kalbos. Bandyk dar kartą."}
            </p>
          )}

          {/* ── Photo thumbnails ── */}
          {attachmentUrls.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {attachmentUrls.slice(0, 5).map((url, i) => (
                <div
                  key={url}
                  className="group relative h-14 w-14 overflow-hidden rounded-md border border-[#d8cda6] dark:border-surface-700"
                >
                  <Image
                    src={optimizeCloudinaryUrl(url, { width: 112, height: 112, crop: "fill" })}
                    alt={`Nuotrauka ${i + 1}`}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => onRemovePhoto(url)}
                    aria-label="Pašalinti nuotrauką"
                    className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-surface-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {photosUploading && (
                <div className="flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-[#d8cda6] dark:border-surface-600">
                  <Loader2 className="h-4 w-4 animate-spin text-[#a89668]" />
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photosUploading || attachmentUrls.length >= 5}
                className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-[#9b8a5f] transition-colors hover:text-[#6f6042] disabled:cursor-not-allowed disabled:opacity-50 dark:text-surface-400 dark:hover:text-surface-200"
              >
                <Plus className="h-3 w-3" />
                Pridėti
              </button>
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {micSupported && (
              <button
                type="button"
                onClick={toggleMic}
                disabled={micStatus === "transcribing"}
                aria-pressed={micStatus === "recording"}
                aria-label={
                  micStatus === "recording"
                    ? "Stabdyti diktavimą"
                    : micStatus === "transcribing"
                      ? "Atpažįstama kalba"
                      : "Diktuoti aprašymą balsu"
                }
                className={cn(
                  "relative grid h-10 w-10 place-items-center rounded-full transition-all hover:scale-105 active:scale-95 disabled:cursor-default disabled:hover:scale-100",
                  micStatus === "recording"
                    ? "bg-[#DC2626] text-white shadow-sm"
                    : "border border-[#D8D2C6] bg-[#F1EDE4] text-[#C25E3A] hover:bg-[#E9E4D9] dark:border-surface-700 dark:bg-surface-800 dark:text-brand-400 dark:hover:bg-surface-700",
                )}
              >
                {micStatus === "recording" && (
                  <span
                    aria-hidden
                    className="absolute inset-0 rounded-full bg-[#DC2626]/40 motion-safe:animate-ping"
                  />
                )}
                {micStatus === "transcribing" ? (
                  <Loader2 className="relative h-5 w-5 animate-spin" />
                ) : (
                  <Mic className="relative h-5 w-5" />
                )}
              </button>
            )}
            {!descriptionStarted && (
              <span className="text-micro tabular-nums text-surface-400 dark:text-surface-500">
                min. {MIN_DESCRIPTION_CHARS} simbolių
              </span>
            )}
            <button
              type="button"
              onClick={onTriggerAi}
              disabled={!aiButtonUnlocked || aiRunning}
              aria-label="Toliau"
              className={cn(
                "ml-auto inline-flex items-center gap-1.5 rounded-md bg-[#A84E2E] px-4 py-2 text-[0.82rem] font-medium text-white shadow-sm transition-all hover:bg-[#933F22]",
                aiButtonUnlocked && !aiRunning && "hover:scale-105 active:scale-95",
                (!aiButtonUnlocked || aiRunning) && "cursor-not-allowed opacity-40 hover:scale-100",
              )}
            >
              {aiRunning && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Toliau
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const files = e.target.files ? Array.from(e.target.files) : [];
              void onUploadFiles(files);
              e.target.value = "";
            }}
          />
          {photoError && (
            <p className="mt-1 text-micro text-red-500 dark:text-red-400">{photoError}</p>
          )}

          {/* ── Divider ── */}
          <div className="mt-5 border-t border-[#d8cda6] dark:border-surface-700/70" />

          {/* ── Meta row (location, budget, deadline, photos) ── */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.8rem] text-surface-600 dark:text-surface-300">
            <MetaItem
              icon={<MapPin className="h-3.5 w-3.5 text-[#a89668]" />}
              value={location}
              filled={hasLocation}
              placeholder="miestas"
              locked={locationLocked}
              active={openMeta === "location"}
              onClick={() => toggleMetaKey("location")}
            />
            <MetaItem
              icon={<Wallet className="h-3.5 w-3.5 text-[#a89668]" />}
              value={budget}
              filled={hasBudget}
              placeholder="biudžetas"
              locked={budgetLocked}
              active={openMeta === "budget"}
              onClick={() => toggleMetaKey("budget")}
            />
            <MetaItem
              icon={<CalendarClock className="h-3.5 w-3.5 text-[#a89668]" />}
              value={deadline}
              filled={hasDeadline}
              placeholder="terminas"
              locked={deadlineLocked}
              active={openMeta === "deadline"}
              onClick={() => toggleMetaKey("deadline")}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={photosUploading || attachmentUrls.length >= 5}
              className="inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[#9b8a5f] transition-colors hover:bg-[#ebe2cb]/40 hover:text-[#6f6042] disabled:cursor-not-allowed disabled:opacity-50 dark:text-surface-500 dark:hover:bg-surface-800/40 dark:hover:text-surface-300"
            >
              {photosUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-[#a89668] dark:text-surface-500" />
              )}
              <span>nuotraukos</span>
            </button>
          </div>
        </div>
      </div>
      <span aria-hidden className="pin absolute left-5 top-3.5" />
      <span aria-hidden className="pin absolute right-5 top-3.5" />

      {/* Photo drop overlay */}
      {photoDragOver && (
        <div className="pointer-events-none absolute inset-x-3 top-3 bottom-7 flex items-center justify-center rounded-lg bg-brand-50/90 dark:bg-brand-950/60">
          <div className="flex items-center gap-2 text-body-sm font-medium text-brand-700 dark:text-brand-300">
            <ImagePlus className="h-5 w-5" /> Įmesk nuotraukas čia
          </div>
        </div>
      )}

      {/* ── Inline meta editor (rendered below the paper sheet) ── */}
      {openMeta && (
        <div className="mt-4 rounded-xl border border-surface-200 bg-white p-4 shadow-card dark:border-surface-700 dark:bg-surface-900">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-micro font-semibold uppercase tracking-wide text-surface-500 dark:text-surface-400">
              {openMeta === "category" &&
                (hasCategory
                  ? `Pridėti dar kategoriją (${selectedCategories.length}/${maxCategories})`
                  : "Pasirink kategoriją")}
              {openMeta === "location" && "Miestas ar vietovė"}
              {openMeta === "budget" && "Biudžetas"}
              {openMeta === "deadline" && "Terminas"}
            </span>
            <button
              type="button"
              onClick={() => setOpenMeta(null)}
              aria-label="Uždaryti"
              className="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-md text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 dark:hover:bg-surface-800 dark:hover:text-surface-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {openMeta === "category" && (
            <>
              <GroupedCategoryPicker
                id="v2-paper-category"
                groups={categoryGroups}
                value=""
                onChange={(value) => {
                  if (!value) return;
                  // Silently dedupe — onAddCategory in the parent ignores duplicates.
                  onAddCategory(value);
                  setOpenMeta(null);
                }}
                mode="id"
              />
              {hasCategory && (
                <p className="mt-1.5 text-micro text-surface-400">
                  Jau pridėta: {selectedCategories.map((c) => c.label).join(", ")}. Jei pasirinksi tą pačią — ji nebus pridėta dar kartą.
                </p>
              )}
            </>
          )}

          {openMeta === "location" && (
            <>
              <input
                autoFocus
                type="text"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setOpenMeta(null);
                  }
                }}
                list="v2-paper-cities"
                autoComplete="off"
                placeholder="Pvz. Vilnius, Trakai"
                className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2 text-body-sm text-surface-900 placeholder:text-surface-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200/60 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100 dark:placeholder:text-surface-500"
              />
              <datalist id="v2-paper-cities">
                {LITHUANIAN_CITIES.map((city) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              <p className="mt-1.5 text-micro text-surface-400">
                Neprivaloma. Praleidi — meistrai matys užklausą iš visos Lietuvos.
              </p>
            </>
          )}

          {openMeta === "budget" && (
            <>
              <input
                autoFocus
                type="text"
                value={budget}
                onChange={(e) => onBudgetChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setOpenMeta(null);
                  }
                }}
                placeholder="Pvz. 500 € arba derinama"
                className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2 text-body-sm text-surface-900 placeholder:text-surface-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200/60 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100 dark:placeholder:text-surface-500"
              />
              <p className="mt-1.5 text-micro text-surface-400">
                Neprivaloma, bet padeda meistrams iškart suprasti, kokius pasiūlymus siųsti.
              </p>
            </>
          )}

          {openMeta === "deadline" && (
            <>
              <input
                autoFocus
                type="text"
                value={deadline}
                onChange={(e) => onDeadlineChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setOpenMeta(null);
                  }
                }}
                placeholder="Pvz. iki gegužės pabaigos, šią savaitę"
                className="w-full rounded-xl border border-surface-200 bg-white px-3.5 py-2 text-body-sm text-surface-900 placeholder:text-surface-400 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200/60 dark:border-surface-700 dark:bg-surface-950 dark:text-surface-100 dark:placeholder:text-surface-500"
              />
              <p className="mt-1.5 text-micro text-surface-400">
                Neprivaloma. Praleidi — meistrai siūlys laiką patys.
              </p>
            </>
          )}
        </div>
      )}
    </article>
  );
}

function MetaItem({
  icon,
  value,
  filled,
  placeholder,
  locked,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  value: string;
  filled: boolean;
  placeholder: string;
  locked: boolean;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 transition-colors",
        active && "bg-brand-50 ring-1 ring-inset ring-brand-300 dark:bg-brand-950/30 dark:ring-brand-700",
        !active && filled && "hover:bg-[#ebe2cb]/40 dark:hover:bg-surface-800/40",
        !active && !filled &&
          "text-[#9b8a5f] hover:bg-[#ebe2cb]/40 hover:text-[#6f6042] dark:text-surface-500 dark:hover:bg-surface-800/40 dark:hover:text-surface-300",
        locked && "cursor-not-allowed opacity-50 hover:bg-transparent dark:hover:bg-transparent",
      )}
    >
      {filled ? icon : <Plus className="h-3.5 w-3.5 text-[#a89668] dark:text-surface-500" />}
      <span className="max-w-[10rem] truncate">{filled ? value : placeholder}</span>
    </button>
  );
}
