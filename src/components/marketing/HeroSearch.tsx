"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, LayoutGrid, Mic } from "lucide-react";
import ImproveDescriptionButton from "@/components/ai/ImproveDescriptionButton";
import { useSpeechRecognition } from "@/lib/use-speech-recognition";

// The box starts ~3 rows tall, grows with the text, and only starts
// scrolling once it reaches the cap (safety limit so it can't grow forever).
const MIN_HEIGHT = 168;
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
    setValue(text.slice(0, MAX_LENGTH));
  }, []);

  const { isSupported, isRecording, micError, toggle } =
    useSpeechRecognition({ onTranscript: handleTranscript });

  function submit() {
    const text = value.trim();
    router.push(
      text
        ? `/uzklausos/nauja?description=${encodeURIComponent(text)}`
        : "/uzklausos/nauja",
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
            isRecording
              ? "Klausau, kalbėkite..."
              : "Pvz. Reikia patikimo santechniko vonios remontui Vilniuje..."
          }
          className="w-full resize-none rounded-[1.75rem] bg-transparent px-6 pt-5 pb-16 text-[1.0625rem] leading-relaxed text-[#26231F] outline-none placeholder:text-[#9A958B]"
        />
        {isSupported && (
          <button
            type="button"
            onClick={() => toggle(value)}
            aria-label={
              isRecording ? "Stabdyti diktavimą" : "Diktuoti aprašymą balsu"
            }
            aria-pressed={isRecording}
            className={`absolute bottom-4 left-4 grid h-10 w-10 place-items-center rounded-full transition-all hover:scale-105 active:scale-95 ${
              isRecording
                ? "bg-[#DC2626] text-white shadow-sm"
                : "border border-[#D8D2C6] bg-[#F1EDE4] text-[#C25E3A] hover:bg-[#E9E4D9]"
            }`}
          >
            {isRecording && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[#DC2626]/40 motion-safe:animate-ping"
              />
            )}
            <Mic className="relative h-5 w-5" />
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

      {micError && (
        <p role="alert" className="mt-2 px-1 text-sm text-[#B4451F]">
          {micError === "unavailable"
            ? "Mikrofonas nepasiekiamas. Patikrinkite, ar jis prijungtas ir nenaudojamas kitos programos."
            : "Nepavyko gauti leidimo mikrofonui. Patikrinkite leidimus naršyklėje ir kompiuterio nustatymuose."}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <a
          href="#kategorijos"
          className="inline-flex items-center gap-2 rounded-full border border-[#D8D2C6] bg-[#F1EDE4]/70 px-4 py-2 text-sm font-medium text-[#57534C] transition-colors hover:bg-[#E9E4D9]"
        >
          <LayoutGrid className="h-4 w-4 text-[#C25E3A]" />
          Naršyti kategorijas
        </a>

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
