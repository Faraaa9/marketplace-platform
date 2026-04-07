"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  return (
    <nav className={cn("flex items-center justify-center gap-1", className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-gray-700"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {pages.map((page, i) =>
        typeof page === "string" ? (
          <span key={`dots-${i}`} className="px-2 text-gray-400">...</span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={cn(
              "rounded-lg px-3 py-1 text-sm font-medium",
              page === currentPage
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
            )}
          >
            {page}
          </button>
        )
      )}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="rounded-lg p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed dark:hover:bg-gray-700"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
