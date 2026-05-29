"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const HOLD_MS = 180; // press longer than this = "hold to pause", not a tap
const SWIPE_PX = 12; // horizontal travel before a press counts as a swipe

/**
 * Auto-advance timer + unified pointer gestures for a story viewer.
 *
 * - quick tap on the left third → previous, elsewhere → next
 * - press and hold → pause (and freeze the progress bar)
 * - horizontal drag → swipe to prev/next
 *
 * Callbacks are read through a ref so passing fresh inline handlers each render
 * doesn't restart the timer. The timer only resets when `resetKey` changes.
 */
export function useStoryPlayer({
  duration,
  onAdvance,
  onRetreat,
  resetKey,
}: {
  duration: number;
  onAdvance: () => void;
  onRetreat: () => void;
  resetKey: unknown;
}) {
  const [paused, setPaused] = useState(false);

  const remainingRef = useRef(duration);
  const startRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef({ onAdvance, onRetreat });
  useEffect(() => {
    cbRef.current = { onAdvance, onRetreat };
  });

  const holdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldRef = useRef(false);
  const downXRef = useRef(0);
  const downYRef = useRef(0);
  const swipingRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    remainingRef.current = duration;
    startRef.current = Date.now();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPaused(false);
    clearTimer();
    timerRef.current = setTimeout(() => cbRef.current.onAdvance(), duration);
    return clearTimer;
  }, [resetKey, duration, clearTimer]);

  const pause = useCallback(() => {
    if (!timerRef.current) return;
    clearTimer();
    remainingRef.current = Math.max(0, remainingRef.current - (Date.now() - startRef.current));
    setPaused(true);
  }, [clearTimer]);

  const resume = useCallback(() => {
    if (timerRef.current) return;
    startRef.current = Date.now();
    timerRef.current = setTimeout(() => cbRef.current.onAdvance(), remainingRef.current);
    setPaused(false);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      downXRef.current = e.clientX;
      downYRef.current = e.clientY;
      heldRef.current = false;
      swipingRef.current = false;
      holdRef.current = setTimeout(() => {
        heldRef.current = true;
        pause();
      }, HOLD_MS);
    },
    [pause],
  );

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (swipingRef.current) return;
    const dx = e.clientX - downXRef.current;
    const dy = e.clientY - downYRef.current;
    if (Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
      swipingRef.current = true;
      if (holdRef.current) {
        clearTimeout(holdRef.current);
        holdRef.current = null;
      }
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (holdRef.current) {
        clearTimeout(holdRef.current);
        holdRef.current = null;
      }
      if (swipingRef.current) {
        const dx = e.clientX - downXRef.current;
        if (dx < 0) cbRef.current.onAdvance();
        else cbRef.current.onRetreat();
        swipingRef.current = false;
        return;
      }
      if (heldRef.current) {
        heldRef.current = false;
        resume();
        return;
      }
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < rect.width * 0.33) cbRef.current.onRetreat();
      else cbRef.current.onAdvance();
    },
    [resume],
  );

  const onPointerLeave = useCallback(() => {
    if (holdRef.current) {
      clearTimeout(holdRef.current);
      holdRef.current = null;
    }
    if (heldRef.current) {
      heldRef.current = false;
      resume();
    }
    swipingRef.current = false;
  }, [resume]);

  return {
    paused,
    pointerHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerLeave },
  };
}

/**
 * Records the view when a story opens and tracks the current viewer's own
 * reaction so the reaction bar can highlight it. Re-tapping the same emoji
 * removes it (toggle). All writes are optimistic; failures are silent — a story
 * is ephemeral and not worth interrupting the viewer with an error.
 */
export function useStoryEngagement(storyId: string | undefined) {
  const [myReaction, setMyReaction] = useState<string | null>(null);
  // Set once the viewer taps a reaction for the current story, so the in-flight
  // view POST response can't clobber a reaction made before it resolved.
  const interactedRef = useRef(false);

  useEffect(() => {
    if (!storyId) return;
    let cancelled = false;
    interactedRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMyReaction(null);
    fetch(`/api/stories/${storyId}/view`, { method: "POST" })
      .then((r) => r.json())
      .then((res) => {
        if (!cancelled && !interactedRef.current && res?.success) {
          setMyReaction(res.myReaction ?? null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [storyId]);

  const react = useCallback(
    (emoji: string) => {
      if (!storyId) return;
      interactedRef.current = true;
      if (myReaction === emoji) {
        setMyReaction(null);
        fetch(`/api/stories/${storyId}/reaction`, { method: "DELETE" }).catch(() => {});
        return;
      }
      setMyReaction(emoji);
      fetch(`/api/stories/${storyId}/reaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emoji }),
      }).catch(() => {});
    },
    [storyId, myReaction],
  );

  return { myReaction, react };
}
