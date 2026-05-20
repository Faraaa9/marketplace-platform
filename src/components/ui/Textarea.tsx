"use client";

import {
  TextareaHTMLAttributes,
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  /** Grow with content instead of showing an inner scrollbar. */
  autoResize?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, autoResize, value, ...props }, ref) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);

    const setRefs = useCallback(
      (node: HTMLTextAreaElement | null) => {
        innerRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref],
    );

    const resize = useCallback(() => {
      const el = innerRef.current;
      if (!el || !autoResize) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }, [autoResize]);

    // Resize on mount and whenever the value changes (typed or pre-filled).
    useEffect(() => {
      resize();
    }, [value, resize]);

    // Re-measure on viewport width changes — the text rewraps.
    useEffect(() => {
      if (!autoResize) return;
      window.addEventListener("resize", resize);
      return () => window.removeEventListener("resize", resize);
    }, [autoResize, resize]);

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={id}
            className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5"
          >
            {label}
          </label>
        )}
        <textarea
          ref={setRefs}
          id={id}
          value={value}
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 min-h-[120px]",
            "duration-150",
            autoResize
              ? "resize-none overflow-hidden transition-[border-color,box-shadow]"
              : "resize-y transition-all",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
            "dark:bg-surface-900 dark:text-surface-100 dark:placeholder:text-surface-500",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600"
              : "border-surface-200 dark:border-surface-700",
            className,
          )}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">
            {error}
          </p>
        )}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";

export default Textarea;
