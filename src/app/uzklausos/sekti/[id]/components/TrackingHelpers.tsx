"use client";

import { useSession } from "next-auth/react";
import { Mail, Search as SearchIcon, Handshake, Lock, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1.5 text-body-sm font-medium transition-colors",
        active
          ? "bg-brand-600 text-white"
          : "bg-surface-100 text-surface-600 hover:bg-surface-200 dark:bg-surface-800 dark:text-surface-300 dark:hover:bg-surface-700",
      )}
    >
      {children}
    </button>
  );
}

export function BookmarkReminder() {
  const { data: session } = useSession();
  if (session) return null;

  return (
    <div className="mb-6 rounded-xl bg-surface-50 border border-surface-200/60 px-4 py-3 dark:bg-surface-800/50 dark:border-surface-700/50">
      <p className="text-micro text-surface-500 dark:text-surface-400">
        <span className="font-medium text-surface-600 dark:text-surface-300">Patarimas:</span>{" "}
        Išsaugokite šį puslapį (bookmark), kad lengvai sugrįžtumėte prie savo užklausos.
      </p>
    </div>
  );
}

export function StatusTimeline({ status, responseCount }: { status: string; responseCount: number }) {
  const steps = [
    { key: "PENDING_CONFIRMATION", label: "Patvirtinimas", icon: <Mail className="h-4 w-4" /> },
    { key: "OPEN", label: "Pasiūlymų laukimas", icon: <SearchIcon className="h-4 w-4" /> },
    { key: "IN_PROGRESS", label: "Vykdoma", icon: <Handshake className="h-4 w-4" /> },
    { key: "CLOSED", label: "Uždaryta", icon: <Lock className="h-4 w-4" /> },
  ];

  const statusOrder = ["PENDING_CONFIRMATION", "OPEN", "IN_PROGRESS", "CLOSED"];
  const currentIndex = statusOrder.indexOf(status);

  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="flex items-center justify-between">
        {steps.map((step, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;

          return (
            <div key={step.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-9 w-9 items-center justify-center rounded-full transition-all ${
                    isCompleted
                      ? "bg-brand-500 text-white"
                      : isCurrent
                        ? "bg-brand-600 text-white ring-4 ring-brand-100 dark:ring-brand-900/50"
                        : "bg-surface-100 text-surface-400 dark:bg-surface-800"
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : step.icon}
                </div>
                <span
                  className={`mt-1.5 text-micro font-medium text-center ${
                    isCurrent
                      ? "text-brand-600 dark:text-brand-400"
                      : isCompleted
                        ? "text-surface-500 dark:text-surface-400"
                        : "text-surface-400"
                  }`}
                >
                  {step.label}
                </span>
                {isCurrent && step.key === "OPEN" && responseCount > 0 && (
                  <span className="mt-0.5 text-micro text-brand-600 dark:text-brand-400 font-semibold">
                    {responseCount} pasiūl.
                  </span>
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded-full ${
                    i < currentIndex
                      ? "bg-brand-500 dark:bg-brand-700"
                      : "bg-surface-200 dark:bg-surface-700"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
