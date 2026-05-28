"use client";

import { useState } from "react";
import { Mail } from "lucide-react";

export default function ResendVerificationBanner() {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleResend() {
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!data.success) {
        setError(data.error || "Nepavyko išsiųsti patvirtinimo laiško.");
        return;
      }
      setSent(true);
    } catch {
      setError("Nepavyko išsiųsti patvirtinimo laiško.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200/60 bg-amber-50 px-4 py-3 dark:border-amber-800/40 dark:bg-amber-500/10">
      <div className="flex items-center gap-3">
        <Mail className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="flex-1 text-body-sm text-amber-800 dark:text-amber-300">
          El. paštas nepatvirtintas — negalėsite peržiūrėti užklausų.
        </p>
        {sent ? (
          <span className="shrink-0 text-body-sm font-medium text-emerald-600 dark:text-emerald-400">Išsiųsta!</span>
        ) : (
          <button
            onClick={handleResend}
            disabled={sending}
            className="shrink-0 text-body-sm font-medium text-amber-700 underline hover:text-amber-800 disabled:opacity-50 dark:text-amber-400 dark:hover:text-amber-300"
          >
            {sending ? "..." : "Siųsti dar kartą"}
          </button>
        )}
      </div>
      {error && (
        <p className="mt-2 text-body-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
