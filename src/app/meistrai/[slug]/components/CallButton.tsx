"use client";

import { Phone } from "lucide-react";
import { normalizePhoneNumber } from "@/lib/phone";
import { trackEvent } from "@/lib/analytics-events";

interface CallButtonProps {
  phone: string | null;
  className?: string;
  label?: string;
}

/**
 * Understated `tel:` call CTA. Renders nothing when the provider has no
 * dial-able LT number, so the prototype's "Skambinti" simply disappears
 * (graceful degradation, never a dead button).
 */
export default function CallButton({ phone, className, label = "Skambinti" }: CallButtonProps) {
  const normalized = phone ? normalizePhoneNumber(phone) : null;
  if (!normalized) return null;

  return (
    <a
      href={`tel:${normalized}`}
      onClick={() => trackEvent("cta_click", { cta: "call" })}
      className={
        className ??
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-5 text-body-sm font-medium text-surface-900 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-white dark:hover:bg-surface-800"
      }
    >
      <Phone className="h-4 w-4" />
      {label}
    </a>
  );
}
