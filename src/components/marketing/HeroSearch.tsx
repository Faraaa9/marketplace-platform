"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowUp, Loader2, Mic, Users, Paperclip, X, ImagePlus } from "lucide-react";
import ImproveDescriptionButton from "@/components/ai/ImproveDescriptionButton";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";
import { useImageUpload } from "@/lib/use-image-upload";
import { saveListingDraft, loadListingDraft } from "@/lib/listing-draft";
import { optimizeCloudinaryUrl } from "@/lib/cloudinary-image";

// The box starts ~3 rows tall, grows with the text, and only starts
// scrolling once it reaches the cap (safety limit so it can't grow forever).
const MIN_HEIGHT = 184;
const MAX_HEIGHT = 400;
const MAX_LENGTH = 2000;

export default function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // When the user hits "next" while still recording/transcribing, we need to
  // finish the voice flow first and only then navigate.
  const pendingSubmitRef = useRef(false);
  const [waitingForTranscript, setWaitingForTranscript] = useState(false);
  const [attachments, setAttachments] = useState<string[]>([]);

  const {
    uploading: photosUploading,
    error: photoError,
    dragOver: photoDragOver,
    uploadFiles: uploadPhotos,
    dropHandlers: photoDropHandlers,
  } = useImageUpload({
    currentCount: attachments.length,
    onUploaded: (urls) => setAttachments((prev) => [...prev, ...urls]),
  });

  function removeAttachment(url: string) {
    setAttachments((prev) => prev.filter((u) => u !== url));
  }

  const autoResize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const content = el.scrollHeight;
    el.style.height = `${Math.min(Math.max(content, MIN_HEIGHT), MAX_HEIGHT)}px`;
    el.style.overflowY = content > MAX_HEIGHT ? "auto" : "hidden";
  }, []);

  // Resize on mount and whenever the text changes (typed or AI-filled).
  useEffect(() => {
    autoResize();
  }, [value, autoResize]);

  // Re-measure when the viewport width changes — the text rewraps.
  useEffect(() => {
    window.addEventListener("resize", autoResize);
    return () => window.removeEventListener("resize", autoResize);
  }, [autoResize]);

  const handleTranscript = useCallback((text: string) => {
    setValue((prev) => {
      const base = prev.trimEnd();
      return (base ? `${base} ${text}` : text).slice(0, MAX_LENGTH);
    });
  }, []);

  const { isSupported, status, error, toggle } = useVoiceRecorder({
    onTranscript: handleTranscript,
  });

  function goToNext(text: string) {
    const trimmed = text.trim();
    // Photos can't ride along in the URL — stash them in the draft so the
    // preview page picks them up via its existing draft-restore flow.
    if (attachments.length > 0) {
      saveListingDraft({
        title: "",
        description: trimmed,
        categoryId: "",
        location: "",
        budget: "",
        deadline: "",
        attachmentUrls: attachments,
        clientName: "",
        clientEmail: "",
        clientPhone: "",
      });
    }
    // The preview page runs the AI extraction and shows the editable listing.
    router.push(
      trimmed ? `/uzklausos/nauja?description=${encodeURIComponent(trimmed)}` : "/uzklausos/nauja",
    );
  }

  function submit() {
    if (waitingForTranscript) return;
    // If the mic is still recording or transcribing, finish that first so the
    // dictated text actually makes it into the URL.
    if (status === "recording" || status === "transcribing") {
      pendingSubmitRef.current = true;
      setWaitingForTranscript(true);
      if (status === "recording") toggle();
      return;
    }
    goToNext(value);
  }

  // Complete a deferred submit once transcription has finished.
  useEffect(() => {
    if (status !== "idle" || !pendingSubmitRef.current) return;
    pendingSubmitRef.current = false;
    setWaitingForTranscript(false);
    goToNext(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, value]);

  // If transcription failed, drop the pending submit so the user can retry.
  useEffect(() => {
    if (error && pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      setWaitingForTranscript(false);
    }
  }, [error]);

  // Restore previously uploaded attachments after a hard refresh — otherwise
  // the user loses the photos they just dragged in.
  useEffect(() => {
    const draft = loadListingDraft();
    if (!draft || draft.attachmentUrls.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restores attachments from sessionStorage after a refresh; see eslint.config.mjs note
    setAttachments(draft.attachmentUrls);
    if (draft.description) {
      setValue((current) => (current ? current : draft.description));
    }
  }, []);

  // Persist attachments (and accompanying description) the moment they change,
  // so they survive a refresh without waiting for the user to hit "next".
  useEffect(() => {
    if (attachments.length === 0) return;
    saveListingDraft({
      title: "",
      description: value,
      categoryId: "",
      location: "",
      budget: "",
      deadline: "",
      attachmentUrls: attachments,
      clientName: "",
      clientEmail: "",
      clientPhone: "",
    });
  }, [attachments, value]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div
        {...photoDropHandlers}
        className={`relative rounded-2xl border bg-surface-50 shadow-lg transition-colors focus-within:border-surface-300 dark:bg-surface-900 dark:focus-within:border-surface-600 ${
          photoDragOver
            ? "border-brand-500 ring-2 ring-brand-500/30"
            : "border-surface-200 dark:border-surface-700"
        }`}
      >
        <textarea
          ref={textareaRef}
          id="hero-description"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          maxLength={MAX_LENGTH}
          placeholder={
            status === "recording"
              ? "Klausau, kalbėkite..."
              : status === "transcribing"
                ? "Atpažįstu, ką pasakei..."
                : "Pvz. Reikia patikimo santechniko vonios remontui Vilniuje. Biudžetas iki 800 €, darbus norėčiau pradėti kitą savaitę."
          }
          className="w-full resize-none rounded-2xl bg-transparent px-6 pt-5 pb-16 text-body-lg leading-relaxed text-surface-900 outline-none placeholder:text-surface-400 dark:text-surface-100 dark:placeholder:text-surface-500"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-2xl bg-gradient-to-t from-surface-50 from-[70%] to-transparent dark:from-surface-900"
        />

        {photoDragOver && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-2xl bg-surface-50/95 dark:bg-surface-900/95">
            <div className="flex items-center gap-2 text-body font-medium text-brand-500 dark:text-brand-400">
              <ImagePlus className="h-6 w-6" /> Įmesk nuotraukas čia
            </div>
          </div>
        )}

        {isSupported && (
          <button
            type="button"
            onClick={toggle}
            disabled={status === "transcribing"}
            aria-label={
              status === "recording"
                ? "Stabdyti diktavimą"
                : status === "transcribing"
                  ? "Atpažįstama kalba"
                  : "Diktuoti aprašymą balsu"
            }
            aria-pressed={status === "recording"}
            className={`absolute bottom-4 left-4 grid h-10 w-10 place-items-center rounded-full transition-all hover:scale-105 active:scale-95 disabled:cursor-default disabled:hover:scale-100 ${
              status === "recording"
                ? "bg-danger text-white shadow-sm"
                : "border border-surface-200 bg-surface-50 text-brand-500 hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800 dark:text-brand-400 dark:hover:bg-surface-700"
            }`}
          >
            {status === "recording" && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-danger/40 motion-safe:animate-ping"
              />
            )}
            {status === "transcribing" ? (
              <Loader2 className="relative h-5 w-5 animate-spin" />
            ) : (
              <Mic className="relative h-5 w-5" />
            )}
          </button>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={photosUploading || attachments.length >= 5}
          aria-label="Pridėti nuotraukų"
          className={`absolute bottom-4 grid h-10 w-10 place-items-center rounded-full border border-surface-200 bg-surface-50 text-brand-500 transition-all hover:scale-105 hover:bg-surface-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100 dark:border-surface-700 dark:bg-surface-800 dark:text-brand-400 dark:hover:bg-surface-700 ${
            isSupported ? "left-16" : "left-4"
          }`}
        >
          {photosUploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Paperclip className="h-5 w-5" />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = e.target.files ? Array.from(e.target.files) : [];
            void uploadPhotos(files);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={submit}
          aria-label={waitingForTranscript ? "Laukiu atpažinimo" : "Tęsti"}
          aria-busy={waitingForTranscript}
          className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-brand-500 text-white shadow-sm transition-all hover:scale-105 hover:bg-brand-600 active:scale-95 disabled:hover:scale-100"
        >
          {waitingForTranscript ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
        </button>
      </div>

      {attachments.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 px-1">
          {attachments.map((url, i) => (
            <div
              key={url}
              className="group relative h-16 w-16 overflow-hidden rounded-lg border border-surface-200 dark:border-surface-700"
            >
              <Image
                src={optimizeCloudinaryUrl(url, { width: 128, height: 128, crop: "fill" })}
                alt={`Nuotrauka ${i + 1}`}
                fill
                sizes="64px"
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => removeAttachment(url)}
                aria-label="Pašalinti nuotrauką"
                className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-surface-900/70 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-2 px-1 text-xs text-surface-400 dark:text-surface-500">
        Patarimas: nuotraukas gali pertempti tiesiai į šį langą. Iki 5, kiekviena iki 25 MB.
      </p>

      {photoError && (
        <p role="alert" className="mt-1 px-1 text-sm text-brand-600 dark:text-red-400">
          {photoError}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 px-1 text-sm text-brand-600 dark:text-red-400">
          {error === "denied"
            ? "Mikrofonas užblokuotas. Leiskite jį naršyklės nustatymuose ir bandykite dar kartą."
            : error === "unavailable"
              ? "Mikrofonas nepasiekiamas. Patikrinkite, ar jis prijungtas."
              : "Nepavyko atpažinti kalbos. Bandykite dar kartą."}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          href="/meistrai"
          className="inline-flex items-center gap-2 rounded-full border border-surface-200 bg-surface-50/70 px-4 py-2 text-sm font-medium text-surface-600 transition-colors hover:bg-surface-100 dark:border-surface-700 dark:bg-surface-800/70 dark:text-surface-300 dark:hover:bg-surface-700"
        >
          <Users className="h-4 w-4 text-brand-500 dark:text-brand-400" />
          Žiūrėti tiekėjus
        </Link>
        <ImproveDescriptionButton
          value={value}
          onChange={setValue}
          targetId="hero-description"
          tone="hero"
        />
      </div>
    </div>
  );
}
