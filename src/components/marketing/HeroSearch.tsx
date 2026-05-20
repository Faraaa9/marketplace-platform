"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, LayoutGrid, Mic, Loader2 } from "lucide-react";
import ImproveDescriptionButton from "@/components/ai/ImproveDescriptionButton";
import { useVoiceRecorder } from "@/lib/use-voice-recorder";

// The box starts ~3 rows tall, grows with the text, and only starts
// scrolling once it reaches the cap (safety limit so it can't grow forever).
const MIN_HEIGHT = 168;
const MAX_HEIGHT = 400;
const MAX_LENGTH = 2000;

export default function HeroSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
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

  async function submit() {
    if (submitting) return;
    const text = value.trim();
    if (!text) {
      router.push("/uzklausos/nauja");
      return;
    }
    const params = new URLSearchParams({ description: text });
    // Pre-fill category / title / city / budget on the form from the
    // description so the user doesn't re-enter what they already said.
    if (text.length >= 15) {
      setSubmitting(true);
      try {
        const res = await fetch("/api/requests/improve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ description: text }),
        });
        const data = (await res.json().catch(() => null)) as {
          success?: boolean;
          data?: {
            category?: string;
            title?: string;
            location?: string;
            budget?: string;
          };
        } | null;
        if (res.ok && data?.success && data.data) {
          if (data.data.category) params.set("category", data.data.category);
          if (data.data.title) params.set("title", data.data.title);
          if (data.data.location) params.set("location", data.data.location);
          if (data.data.budget) params.set("budget", data.data.budget);
        }
      } catch {
        // Navigate with just the description if the AI call fails.
      }
    }
    router.push(`/uzklausos/nauja?${params.toString()}`);
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
                : "Pvz. Reikia patikimo santechniko vonios remontui Vilniuje..."
          }
          className="w-full resize-none rounded-[1.75rem] bg-transparent px-6 pt-5 pb-16 text-[1.0625rem] leading-relaxed text-[#26231F] outline-none placeholder:text-[#9A958B]"
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
          disabled={submitting}
          aria-label="Tęsti"
          className="absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full bg-[#C25E3A] text-white shadow-sm transition-all hover:scale-105 hover:bg-[#A84E2E] active:scale-95 disabled:hover:scale-100"
        >
          {submitting ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <ArrowUp className="h-5 w-5" />
          )}
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
