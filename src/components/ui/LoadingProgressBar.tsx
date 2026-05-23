"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * Thin top-of-page loading bar that activates on App Router navigations.
 * Zero dependencies — pure CSS transitions.
 *
 * Behavior:
 * - On navigation start (path/search change detected): bar appears and quickly
 *   advances to ~80%, giving immediate "I clicked it" feedback.
 * - On navigation end (new page rendered): bar completes to 100% and fades out.
 * - Minimum visible time prevents flicker on fast navigations.
 */

type Phase = "idle" | "loading" | "completing";

const TRICKLE_TO = 80;
const COMPLETE_DURATION_MS = 200;

export default function LoadingProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const trickleRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const completeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevUrl = useRef(`${pathname}?${searchParams.toString()}`);

  const clearTimers = useCallback(() => {
    if (trickleRef.current) {
      clearInterval(trickleRef.current);
      trickleRef.current = null;
    }
    if (completeTimerRef.current) {
      clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  }, []);

  // Detect click on internal links to start the bar immediately
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) return;
      if (anchor.target === "_blank") return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      // Only start if navigating to a different URL
      if (href === pathname && !anchor.search) return;

      // Avoid re-triggering if already loading
      if (phase === "loading") return;

      clearTimers();
      setProgress(0);
      setPhase("loading");

      // Trickle: advance quickly at first, then slow down approaching 80%
      let p = 0;
      trickleRef.current = setInterval(() => {
        const remaining = TRICKLE_TO - p;
        const increment = Math.max(0.5, remaining * 0.1);
        p = Math.min(TRICKLE_TO, p + increment);
        setProgress(p);
      }, 100);
    }

    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [pathname, searchParams, phase, clearTimers]);

  // When path/search actually changes → complete the bar
  useEffect(() => {
    const currentUrl = `${pathname}?${searchParams.toString()}`;
    if (currentUrl === prevUrl.current) return;
    prevUrl.current = currentUrl;

    if (phase !== "loading") return;

    clearTimers();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setProgress(100);
    setPhase("completing");

    completeTimerRef.current = setTimeout(() => {
      setPhase("idle");
      setProgress(0);
    }, COMPLETE_DURATION_MS);
  }, [pathname, searchParams, phase, clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  if (phase === "idle") return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[3px] pointer-events-none"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-brand-500 shadow-[0_0_8px_rgba(99,102,241,0.4)]"
        style={{
          width: `${progress}%`,
          transition: phase === "completing"
            ? `width ${COMPLETE_DURATION_MS}ms ease-out, opacity ${COMPLETE_DURATION_MS}ms ease-out ${COMPLETE_DURATION_MS / 2}ms`
            : "width 200ms ease-out",
          opacity: phase === "completing" ? 0 : 1,
        }}
      />
    </div>
  );
}
