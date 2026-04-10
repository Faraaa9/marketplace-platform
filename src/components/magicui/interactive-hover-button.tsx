"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
}

const InteractiveHoverButton = forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(({ children, className, icon, ...props }, ref) => {
  return (
    <button
      ref={ref}
      className={cn(
        "group relative h-10 cursor-pointer overflow-hidden rounded-xl border border-surface-200 bg-white px-5 text-body-sm font-medium transition-all duration-300",
        "dark:border-surface-700 dark:bg-surface-900",
        "hover:border-surface-300 dark:hover:border-surface-600",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        className
      )}
      {...props}
    >
      <span className="inline-flex items-center gap-2 text-surface-700 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0 dark:text-surface-300">
        {icon}
        {children}
      </span>
      <div className="absolute top-0 left-0 z-10 flex h-full w-full translate-x-[-100%] items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100">
        <span>{children}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
      <span className="absolute inset-0 z-0 translate-x-[-100%] bg-surface-800 transition-transform duration-300 group-hover:translate-x-0 dark:bg-surface-200" />
    </button>
  );
});

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };
