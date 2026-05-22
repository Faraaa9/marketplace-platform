"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Mail, Send } from "lucide-react";
import Button from "@/components/ui/Button";

interface EmailVerificationProps {
  email: string;
  onEmailChange: (value: string) => void;
  verified: boolean;
  onVerifiedChange: (value: boolean) => void;
}

const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email field with inline 6-digit code verification. The request can only be
 * published once the email is confirmed.
 */
export default function EmailVerification({
  email,
  onEmailChange,
  verified,
  onVerifiedChange,
}: EmailVerificationProps) {
  const [step, setStep] = useState<"edit" | "code">("edit");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [error, setError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const emailValid = EMAIL_RE.test(email.trim());

  async function sendCode() {
    if (sending || !emailValid) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/requests/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setMaskedEmail(data.data?.maskedEmail || email.trim());
        setCode("");
        setStep("code");
        setResendIn(RESEND_SECONDS);
      } else {
        setError(data?.error || "Nepavyko išsiųsti kodo");
      }
    } catch {
      setError("Nepavyko išsiųsti kodo. Bandykite dar kartą.");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(value: string) {
    if (verifying) return;
    setVerifying(true);
    setError("");
    try {
      const res = await fetch("/api/requests/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: value }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        onVerifiedChange(true);
      } else {
        setError(data?.error || "Neteisingas kodas");
        setCode("");
      }
    } catch {
      setError("Nepavyko patvirtinti. Bandykite dar kartą.");
    } finally {
      setVerifying(false);
    }
  }

  function handleCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (error) setError("");
    if (digits.length === 6) verifyCode(digits);
  }

  // ── Verified ──
  if (verified) {
    return (
      <div>
        <p className="mb-1.5 text-body-sm font-medium text-surface-700 dark:text-surface-300">El. paštas</p>
        <div className="flex h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 dark:border-emerald-700 dark:bg-emerald-500/10">
          <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="flex-1 truncate text-body-sm text-surface-900 dark:text-surface-100">{email}</span>
          <span className="text-micro font-medium text-emerald-600 dark:text-emerald-400">Patvirtinta</span>
        </div>
        <button
          type="button"
          onClick={() => {
            onVerifiedChange(false);
            setStep("edit");
            setCode("");
            setError("");
          }}
          className="mt-1.5 text-micro text-surface-400 underline-offset-2 hover:text-surface-600 hover:underline dark:hover:text-surface-200"
        >
          Keisti el. paštą
        </button>
      </div>
    );
  }

  // ── Code entry ──
  if (step === "code") {
    return (
      <div>
        <label
          htmlFor="verify-code"
          className="mb-1.5 block text-body-sm font-medium text-surface-700 dark:text-surface-300"
        >
          Patvirtinimo kodas
        </label>
        <p className="mb-2 flex items-center gap-1.5 text-micro text-surface-500 dark:text-surface-400">
          <Mail className="h-3.5 w-3.5 shrink-0" /> Kodą išsiuntėme į {maskedEmail}
        </p>
        <input
          id="verify-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          placeholder="••••••"
          disabled={verifying}
          className="h-12 w-full rounded-xl border border-surface-200 bg-white text-center text-heading-3 font-semibold tracking-[0.4em] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
        />
        {error && <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{error}</p>}
        {verifying && (
          <p className="mt-1.5 flex items-center gap-1.5 text-micro text-surface-500 dark:text-surface-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Tikrinama…
          </p>
        )}
        <div className="mt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              setStep("edit");
              setCode("");
              setError("");
            }}
            className="text-micro text-surface-400 underline-offset-2 hover:text-surface-600 hover:underline dark:hover:text-surface-200"
          >
            Keisti el. paštą
          </button>
          <button
            type="button"
            disabled={resendIn > 0 || sending}
            onClick={sendCode}
            className="text-micro font-medium text-brand-600 underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-surface-400 disabled:no-underline dark:text-brand-400"
          >
            {sending
              ? "Siunčiama…"
              : resendIn > 0
                ? `Siųsti dar kartą (${resendIn}s)`
                : "Siųsti dar kartą"}
          </button>
        </div>
      </div>
    );
  }

  // ── Email entry ──
  return (
    <div>
      <label
        htmlFor="clientEmail"
        className="mb-1.5 block text-body-sm font-medium text-surface-700 dark:text-surface-300"
      >
        El. paštas
      </label>
      <div className="flex gap-2">
        <input
          id="clientEmail"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="jusu@pastas.lt"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className="h-11 min-w-0 flex-1 rounded-xl border border-surface-200 bg-white px-3.5 text-body-sm text-surface-900 placeholder:text-surface-400 transition-all duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:placeholder:text-surface-500"
        />
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={sendCode}
          disabled={!emailValid}
          isLoading={sending}
          className="h-11 min-w-[112px] shrink-0 px-3"
        >
          {!sending && <Send className="h-4 w-4" />}
          {sending ? "Siunčiama…" : "Patvirtinti"}
        </Button>
      </div>
      {error && <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{error}</p>}
      <p className="mt-1.5 text-micro text-surface-400">
        Atsiųsime 6 skaitmenų kodą — jį įvedus galėsi paskelbti skelbimą.
      </p>
    </div>
  );
}
