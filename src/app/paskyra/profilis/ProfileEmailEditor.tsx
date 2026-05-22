"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Mail, Send } from "lucide-react";
import Button from "@/components/ui/Button";

interface ProfileEmailEditorProps {
  currentEmail: string;
  verified: boolean;
  onChanged: (email: string, emailVerifiedAt: string) => void;
}

type Step = "idle" | "edit" | "code";

const RESEND_SECONDS = 60;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Profile-only email change widget. Shows the current address by default, and
 * expands into a "new email → 6-digit code" flow on demand.
 */
export default function ProfileEmailEditor({
  currentEmail,
  verified,
  onChanged,
}: ProfileEmailEditorProps) {
  const [step, setStep] = useState<Step>("idle");
  const [newEmail, setNewEmail] = useState("");
  const [code, setCode] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const targetEmail = newEmail.trim().toLowerCase();
  const emailValid =
    EMAIL_RE.test(targetEmail) && targetEmail !== currentEmail.toLowerCase();

  function reset() {
    setStep("idle");
    setNewEmail("");
    setCode("");
    setMaskedEmail("");
    setError("");
    setInfo("");
    setSending(false);
    setVerifying(false);
  }

  async function sendCode() {
    if (sending || !emailValid) return;
    setSending(true);
    setError("");
    setInfo("");
    try {
      const res = await fetch("/api/paskyra/profilis/send-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setMaskedEmail(data.data?.maskedEmail || targetEmail);
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
      const res = await fetch("/api/paskyra/profilis/verify-email-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail, code: value }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data?.email) {
        const verifiedAt: string =
          typeof data.data.emailVerified === "string"
            ? data.data.emailVerified
            : new Date().toISOString();
        onChanged(data.data.email, verifiedAt);
        reset();
        setInfo("El. paštas pakeistas. Kitą kartą prisijunkite naudodami naują adresą.");
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

  // ── Idle: just show current email + a small "Keisti" affordance ──
  if (step === "idle") {
    return (
      <div>
        <p className="mb-1.5 text-body-sm font-medium text-surface-700 dark:text-surface-300">
          El. paštas
        </p>
        <div className="flex h-11 items-center gap-2 rounded-xl border border-surface-200 bg-surface-50 px-3.5 text-body-sm text-surface-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200">
          <Mail className="h-4 w-4 shrink-0 text-surface-400" />
          <span className="min-w-0 flex-1 truncate">{currentEmail}</span>
          {verified && (
            <span className="shrink-0 text-micro font-medium text-emerald-600 dark:text-emerald-400">
              Patvirtinta
            </span>
          )}
        </div>
        {info && (
          <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-micro text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            {info}
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setStep("edit");
            setInfo("");
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
          htmlFor="profile-email-code"
          className="mb-1.5 block text-body-sm font-medium text-surface-700 dark:text-surface-300"
        >
          Patvirtinimo kodas
        </label>
        <p className="mb-2 flex items-center gap-1.5 text-micro text-surface-500 dark:text-surface-400">
          <Mail className="h-3.5 w-3.5 shrink-0" /> Kodą išsiuntėme į {maskedEmail}
        </p>
        <input
          id="profile-email-code"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => handleCodeChange(event.target.value)}
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
            Keisti adresą
          </button>
          <div className="flex items-center gap-3">
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
            <button
              type="button"
              onClick={reset}
              className="text-micro text-surface-400 underline-offset-2 hover:text-surface-600 hover:underline dark:hover:text-surface-200"
            >
              Atšaukti
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Edit (new email input) ──
  return (
    <div>
      <label
        htmlFor="profile-new-email"
        className="mb-1.5 block text-body-sm font-medium text-surface-700 dark:text-surface-300"
      >
        Naujas el. paštas
      </label>
      <p className="mb-2 text-micro text-surface-500 dark:text-surface-400">
        Dabartinis: <span className="font-medium text-surface-700 dark:text-surface-200">{currentEmail}</span>
      </p>
      <div className="flex gap-2">
        <input
          id="profile-new-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="naujas@pastas.lt"
          value={newEmail}
          onChange={(event) => {
            setNewEmail(event.target.value);
            if (error) setError("");
          }}
          className="h-11 min-w-0 flex-1 rounded-xl border border-surface-200 bg-white px-3.5 text-body-sm text-surface-900 placeholder:text-surface-400 transition-all duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:placeholder:text-surface-500"
        />
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={sendCode}
          disabled={!emailValid}
          isLoading={sending}
          className="h-11 min-w-[116px] shrink-0 px-3"
        >
          {!sending && <Send className="h-4 w-4" />}
          {sending ? "Siunčiama…" : "Gauti kodą"}
        </Button>
      </div>
      {error ? (
        <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{error}</p>
      ) : (
        <p className="mt-1.5 text-micro text-surface-400">
          Atsiųsime 6 skaitmenų kodą į naują adresą. Pakeitimas įsigalios įvedus kodą.
        </p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-2 text-micro text-surface-400 underline-offset-2 hover:text-surface-600 hover:underline dark:hover:text-surface-200"
      >
        Atšaukti
      </button>
      {verified && (
        <p className="mt-2 flex items-center gap-1.5 text-micro text-emerald-600 dark:text-emerald-400">
          <Check className="h-3.5 w-3.5" /> Dabartinis adresas patvirtintas.
        </p>
      )}
    </div>
  );
}
