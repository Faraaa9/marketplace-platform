"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Phone, Send } from "lucide-react";
import Button from "@/components/ui/Button";

interface PhoneVerificationProps {
  phone: string;
  onPhoneChange: (value: string) => void;
  verified: boolean;
  onVerifiedChange: (value: boolean) => void;
  onVerified?: (phone: string, phoneVerifiedAt: string) => void;
  error?: string;
  label?: string;
  helper?: string;
  inputId?: string;
}

const RESEND_SECONDS = 60;

export default function PhoneVerification({
  phone,
  onPhoneChange,
  verified,
  onVerifiedChange,
  onVerified,
  error,
  label = "Telefonas",
  helper = "Atsiųsime 6 skaitmenų SMS kodą — jį įvedus galėsi skelbti.",
  inputId = "clientPhone",
}: PhoneVerificationProps) {
  const [step, setStep] = useState<"edit" | "code">("edit");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");
  const [maskedPhone, setMaskedPhone] = useState("");
  const [localError, setLocalError] = useState("");
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const phoneReady = phone.trim().replace(/\D/g, "").length >= 8;

  async function sendCode() {
    if (sending || !phoneReady) return;
    setSending(true);
    setLocalError("");
    try {
      const res = await fetch("/api/requests/send-phone-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const normalizedPhone = data.data?.phone || phone.trim();
        onPhoneChange(normalizedPhone);
        onVerifiedChange(false);
        setMaskedPhone(data.data?.maskedPhone || normalizedPhone);
        setCode("");
        setStep("code");
        setResendIn(RESEND_SECONDS);
      } else {
        setLocalError(data?.error || "Nepavyko išsiųsti SMS kodo");
      }
    } catch {
      setLocalError("Nepavyko išsiųsti SMS kodo. Bandykite dar kartą.");
    } finally {
      setSending(false);
    }
  }

  async function verifyCode(value: string) {
    if (verifying) return;
    setVerifying(true);
    setLocalError("");
    try {
      const res = await fetch("/api/requests/verify-phone-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), code: value }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const verifiedPhone = data.data?.phone || phone.trim();
        const verifiedAt = data.data?.phoneVerifiedAt || new Date().toISOString();
        onPhoneChange(verifiedPhone);
        onVerifiedChange(true);
        onVerified?.(verifiedPhone, verifiedAt);
        setStep("edit");
      } else {
        setLocalError(data?.error || "Neteisingas kodas");
        setCode("");
      }
    } catch {
      setLocalError("Nepavyko patvirtinti telefono. Bandykite dar kartą.");
    } finally {
      setVerifying(false);
    }
  }

  function handleCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
    if (localError) setLocalError("");
    if (digits.length === 6) verifyCode(digits);
  }

  if (verified) {
    return (
      <div>
        <p className="mb-1.5 text-body-sm font-medium text-surface-700 dark:text-surface-300">{label}</p>
        <div className="flex h-10 items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 dark:border-emerald-700 dark:bg-emerald-500/10">
          <Check className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="flex-1 truncate text-body-sm text-surface-900 dark:text-surface-100">{phone}</span>
          <span className="text-micro font-medium text-emerald-600 dark:text-emerald-400">Patvirtinta</span>
        </div>
        <button
          type="button"
          onClick={() => {
            onVerifiedChange(false);
            setStep("edit");
            setCode("");
            setLocalError("");
          }}
          className="mt-1.5 text-micro text-surface-400 underline-offset-2 hover:text-surface-600 hover:underline dark:hover:text-surface-200"
        >
          Keisti telefoną
        </button>
      </div>
    );
  }

  if (step === "code") {
    return (
      <div>
        <label
          htmlFor={`${inputId}-code`}
          className="mb-1.5 block text-body-sm font-medium text-surface-700 dark:text-surface-300"
        >
          SMS kodas
        </label>
        <p className="mb-2 flex items-center gap-1.5 text-micro text-surface-500 dark:text-surface-400">
          <Phone className="h-3.5 w-3.5 shrink-0" /> Kodą išsiuntėme į {maskedPhone || phone}
        </p>
        <input
          id={`${inputId}-code`}
          inputMode="numeric"
          autoComplete="one-time-code"
          value={code}
          onChange={(event) => handleCodeChange(event.target.value)}
          placeholder="••••••"
          disabled={verifying}
          className="h-12 w-full rounded-xl border border-surface-200 bg-white text-center text-heading-3 font-semibold tracking-[0.4em] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:opacity-60 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100"
        />
        {localError && <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{localError}</p>}
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
              setLocalError("");
            }}
            className="text-micro text-surface-400 underline-offset-2 hover:text-surface-600 hover:underline dark:hover:text-surface-200"
          >
            Keisti telefoną
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

  return (
    <div>
      <label
        htmlFor={inputId}
        className="mb-1.5 block text-body-sm font-medium text-surface-700 dark:text-surface-300"
      >
        {label}
      </label>
      <div className="flex gap-2">
        <input
          id={inputId}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="+370 6..."
          value={phone}
          onChange={(event) => {
            onPhoneChange(event.target.value);
            onVerifiedChange(false);
            if (localError) setLocalError("");
          }}
          className={[
            "h-11 min-w-0 flex-1 rounded-xl border bg-white px-3.5 text-body-sm text-surface-900 placeholder:text-surface-400",
            "transition-all duration-150 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20",
            "dark:bg-surface-900 dark:text-surface-100 dark:placeholder:text-surface-500",
            error
              ? "border-red-300 focus:border-red-500 focus:ring-red-500/20 dark:border-red-600"
              : "border-surface-200 dark:border-surface-700",
          ].join(" ")}
        />
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={sendCode}
          disabled={!phoneReady}
          isLoading={sending}
          className="h-11 min-w-[116px] shrink-0 px-3"
        >
          {!sending && <Send className="h-4 w-4" />}
          {sending ? "Siunčiama…" : "Gauti kodą"}
        </Button>
      </div>
      {error ? (
        <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{error}</p>
      ) : localError ? (
        <p className="mt-1.5 text-micro text-red-500 dark:text-red-400">{localError}</p>
      ) : (
        <p className="mt-1.5 text-micro text-surface-400">{helper}</p>
      )}
    </div>
  );
}
