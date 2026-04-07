"use client";

import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={id}
          className={cn(
            "w-full rounded-xl border bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 min-h-[120px] resize-y",
            "transition-all duration-150",
            "focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500",
            "dark:bg-surface-900 dark:text-surface-100 dark:placeholder:text-surface-500",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600"
              : "border-surface-200 dark:border-surface-700",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = "Textarea";

export default Textarea;
