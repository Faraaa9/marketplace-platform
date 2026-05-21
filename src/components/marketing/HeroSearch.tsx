"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowUp, Loader2, Mic, Users } from "lucide-react";
import ImproveDescriptionButton from "@/components/ai/ImproveDescriptionButton";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";

// The box starts ~3 rows tall, grows with the text, and only starts
// scrolling once it reaches the cap (safety limit so it can't grow forever).
const MIN_HEIGHT = 184;
const MAX_HEIGHT = 400;
const MAX_LENGTH = 2000;

export default function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  function submit() {
    const text = value.trim();
    // The preview page runs the AI extraction and shows the editable listing.
    router.push(
      text ? `/uzklausos/nauja?description=${encodeURIComponent(text)}` : "/uzklausos/nauja",
    );
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="relative rounded-[1.75rem] border border-[#D8D2C6] bg-[#FBFAF6] shadow-[0_18px_48px_-20px_rgba(40,35,30,0.28)] transition-colors focus-within:border-[#C5B7A4]">
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
          className="w-full resize-none rounded-[1.75rem] bg-transparent px-6 pt-5 pb-16 text-[1.0625rem] leading-relaxed text-[#26231F] outline-none placeholder:text-[#9A958B]"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-20 rounded-b-[1.75rem] bg-gradient-to-t from-[#FBFAF6] from-[70%] to-transparent"
        />

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
                ? "bg-[#DC2626] text-white shadow-sm"
                : "border border-[#D8D2C6] bg-[#F1EDE4] text-[#C25E3A] hover:bg-[#E9E4D9]"
            }`}
          >
            {status === "recording" && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[#DC2626]/40 motion-safe:animate-ping"
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
          onClick={submit}
          aria-label="Tęsti"
          className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-[#C25E3A] text-white shadow-sm transition-all hover:scale-105 hover:bg-[#A84E2E] active:scale-95"
        >
          <ArrowUp className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 px-1 text-sm text-[#B4451F]">
          {error === "denied"
            ? "Mikrofonas užblokuotas. Leiskite jį naršyklės nustatymuose ir bandykite dar kartą."
            : error === "unavailable"
              ? "Mikrofonas nepasiekiamas. Patikrinkite, ar jis prijungtas."
              : "Nepavyko atpažinti kalbos. Bandykite dar kartą."}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <Link
          href="/tiekejai"
          className="inline-flex items-center gap-2 rounded-full border border-[#D8D2C6] bg-[#F1EDE4]/70 px-4 py-2 text-sm font-medium text-[#57534C] transition-colors hover:bg-[#E9E4D9]"
        >
          <Users className="h-4 w-4 text-[#C25E3A]" />
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
