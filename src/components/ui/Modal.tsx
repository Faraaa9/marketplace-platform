"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export default function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-2xl bg-white p-6 shadow-stripe-lg animate-scale-in",
          "dark:bg-surface-900 dark:border dark:border-surface-700/50",
          className
        )}
      >
        <div className="flex items-center justify-between mb-5">
          {title && <h2 className="text-heading-3 text-surface-900 dark:text-white">{title}</h2>}
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-surface-400 hover:bg-surface-100 hover:text-surface-600 transition-colors dark:hover:bg-surface-800 dark:hover:text-surface-300"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
