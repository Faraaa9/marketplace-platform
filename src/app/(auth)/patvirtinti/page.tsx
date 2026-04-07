"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";

export default function VerifyEmailPage() {
  return <Suspense fallback={<LoadingSpinner />}><VerifyEmailContent /></Suspense>;
}

function ResendButton({ email }: { email?: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [inputEmail, setInputEmail] = useState(email || "");

  async function handleResend() {
    if (!inputEmail) return;
    setSending(true);
    try {
      await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inputEmail }),
      });
      setSent(true);
    } catch {} finally {
      setSending(false);
    }
  }

  if (sent) {
    return <p className="mt-4 text-body-sm text-emerald-600 dark:text-emerald-400">Patvirtinimo laiškas išsiųstas! Patikrinkite el. paštą.</p>;
  }

  return (
    <div className="mt-6 space-y-3">
      {!email && (
        <input
          type="email"
          placeholder="Jūsų el. paštas"
          value={inputEmail}
          onChange={(e) => setInputEmail(e.target.value)}
          className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2 text-body-sm ring-1 ring-transparent focus:border-brand-500 focus:ring-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-white"
        />
      )}
      <Button onClick={handleResend} isLoading={sending} variant="outline" className="w-full" disabled={!inputEmail}>
        Siųsti naują patvirtinimo nuorodą
      </Button>
    </div>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");

  if (status === "success") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-surface-200/60 bg-white p-8 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
              <span className="text-display font-bold text-emerald-500">✓</span>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">El. paštas patvirtintas!</h1>
            <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
              Jūsų el. pašto adresas sėkmingai patvirtintas. Dabar galite naudotis visomis platformos funkcijomis.
            </p>
            <Link
              href="/prisijungti"
              className="mt-6 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-body-sm font-medium text-white hover:bg-brand-700 transition-colors"
            >
              Prisijungti
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-surface-200/60 bg-white p-8 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Nuoroda nebegalioja</h1>
            <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
              Ši patvirtinimo nuoroda nebegalioja. Įveskite el. paštą, kad gautumėte naują nuorodą.
            </p>
            <ResendButton />
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="rounded-2xl border border-surface-200/60 bg-white p-8 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Įvyko klaida</h1>
            <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
              Nepavyko patvirtinti el. pašto adreso. Bandykite dar kartą.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Default: check your email message (shown after registration)
  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <div className="rounded-2xl border border-surface-200/60 bg-white p-8 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
            <span className="text-display font-bold text-brand-500">✉</span>
          </div>
          <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Patikrinkite el. paštą</h1>
          <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
            Išsiuntėme patvirtinimo nuorodą į jūsų el. pašto adresą. Spauskite nuorodą laiške, kad patvirtintumėte paskyrą.
          </p>
          <ResendButton />
          <Link
            href="/prisijungti"
            className="mt-4 inline-block text-body-sm text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            Grįžti į prisijungimą
          </Link>
        </div>
      </div>
    </div>
  );
}
