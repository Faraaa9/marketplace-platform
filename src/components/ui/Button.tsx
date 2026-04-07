"use client";

import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary:
        "bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm hover:shadow-md dark:bg-brand-500 dark:hover:bg-brand-600",
      secondary:
        "bg-surface-100 text-surface-800 hover:bg-surface-200 active:bg-surface-300 dark:bg-surface-800 dark:text-surface-200 dark:hover:bg-surface-700",
      outline:
        "border border-surface-200 text-surface-700 hover:bg-surface-50 hover:border-surface-300 active:bg-surface-100 dark:border-surface-700 dark:text-surface-300 dark:hover:bg-surface-800 dark:hover:border-surface-600",
      ghost:
        "text-surface-600 hover:bg-surface-100 hover:text-surface-900 active:bg-surface-200 dark:text-surface-400 dark:hover:bg-surface-800 dark:hover:text-surface-200",
      danger:
        "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm dark:bg-red-500 dark:hover:bg-red-600",
    };

    const sizes = {
      sm: "h-8 px-3 text-body-sm gap-1.5 rounded-lg",
      md: "h-10 px-4 text-body-sm gap-2 rounded-xl",
      lg: "h-12 px-6 text-body gap-2.5 rounded-xl",
    };

    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export default Button;
