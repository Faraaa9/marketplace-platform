"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  CheckCircle,
  LogIn,
  Mail,
  RefreshCw,
  Send,
  X,
} from "lucide-react";
import Button from "@/components/ui/Button";
import { InteractiveHoverButton } from "@/components/magicui/interactive-hover-button";
import {
  clearInquiryForm,
  loadInquiryForm,
  saveInquiryForm,
} from "@/lib/inquiry-form-persist";

type VerifyStep = "form" | "code" | "needsLogin";

interface DirectInquiryWidgetProps {
  providerId: string;
  providerName: string;
  isSelf: boolean;
}

export default function DirectInquiryWidget({
  providerId,
  providerName,
  isSelf,
}: DirectInquiryWidgetProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const inquiryRef = useRef<HTMLDivElement>(null);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({
    description: "",
    budget: "",
    senderEmail: "",
    senderPhone: "",
    senderName: "",
  });
  const [inquirySending, setInquirySending] = useState(false);
  const [inquiryResult, setInquiryResult] = useState<{ success: boolean; message: string } | null>(null);
  const [inquiryError, setInquiryError] = useState("");
  const [verifyStep, setVerifyStep] = useState<VerifyStep>("form");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const isLoggedIn = !!session?.user;

  useEffect(() => {
    function openFromHash() {
      if (window.location.hash !== "#zinute") return;
      openInquiryForm();
    }

    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (searchParams.get("inquiry") !== "1") return;
    const saved = loadInquiryForm(providerId);
    if (saved) {
      setInquiryForm({
        description: saved.description,
        budget: saved.budget,
        senderEmail: saved.senderEmail,
        senderPhone: saved.senderPhone,
        senderName: saved.senderName,
      });
      clearInquiryForm();
    }
    setShowInquiry(true);
    setTimeout(() => inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 200);
  }, [providerId, searchParams]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  if (isSelf) {
    return (
      <div id="zinute" className="rounded-2xl border border-surface-200/60 bg-white p-5 text-body-sm text-surface-500 dark:border-surface-700/50 dark:bg-surface-900/50 dark:text-surface-400">
        Tai jūsų profilis, todėl tiesioginės žinutės sau išsiųsti nereikia.
      </div>
    );
  }

  async function handleAuthSubmit(e: React.FormEvent) {
    e.preventDefault();
    setInquiryError("");
    setInquiryResult(null);

    if (inquiryForm.description.length < 20) {
      setInquiryError("Žinutė turi būti bent 20 simbolių");
      return;
    }

    setInquirySending(true);
    try {
      const res = await fetch("/api/direct-inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          description: inquiryForm.description,
          budget: inquiryForm.budget || undefined,
          senderPhone: inquiryForm.senderPhone || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiryResult({ success: true, message: "Žinutė išsiųsta!" });
        setInquiryForm({ description: "", budget: "", senderEmail: "", senderPhone: "", senderName: "" });
      } else {
        setInquiryResult({ success: false, message: data.error || "Nepavyko išsiųsti žinutės" });
      }
    } catch {
      setInquiryResult({ success: false, message: "Tinklo klaida. Pabandykite dar kartą." });
    } finally {
      setInquirySending(false);
    }
  }

  async function handleGuestInitiate(e: React.FormEvent) {
    e.preventDefault();
    setInquiryError("");
    setInquiryResult(null);

    if (inquiryForm.description.length < 20) {
      setInquiryError("Žinutė turi būti bent 20 simbolių");
      return;
    }
    if (!inquiryForm.senderEmail) {
      setInquiryError("El. pašto adresas privalomas");
      return;
    }

    setInquirySending(true);
    try {
      const res = await fetch("/api/direct-inquiry/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId,
          description: inquiryForm.description,
          budget: inquiryForm.budget || undefined,
          senderEmail: inquiryForm.senderEmail,
          senderPhone: inquiryForm.senderPhone || undefined,
          senderName: inquiryForm.senderName || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPendingId(data.data.pendingId);
        setMaskedEmail(data.data.maskedEmail);
        setVerifyStep("code");
        setVerifyCode("");
        setVerifyError(data.data.alreadyPending ? "Kodas jau buvo išsiųstas. Galite naudoti jį arba siųsti naują." : "");
      } else if (data.needsLogin) {
        saveInquiryForm({ ...inquiryForm, providerId });
        setVerifyStep("needsLogin");
      } else {
        setInquiryError(data.error || "Nepavyko pradėti užklausos");
      }
    } catch {
      setInquiryError("Tinklo klaida. Pabandykite dar kartą.");
    } finally {
      setInquirySending(false);
    }
  }

  async function handleVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingId) return;
    setVerifyError("");
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/direct-inquiry/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId, code: verifyCode }),
      });
      const data = await res.json();
      if (data.success) {
        setVerifyStep("form");
        setInquiryResult({ success: true, message: "Žinutė išsiųsta!" });
        setInquiryForm({ description: "", budget: "", senderEmail: "", senderPhone: "", senderName: "" });
        setPendingId(null);
        setVerifyCode("");
      } else if (data.expired) {
        setVerifyStep("form");
        setInquiryError(data.error || "Kodas nebegalioja. Pabandykite iš naujo.");
        setPendingId(null);
      } else {
        setVerifyError(data.error || "Neteisingas kodas");
      }
    } catch {
      setVerifyError("Tinklo klaida. Pabandykite dar kartą.");
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleResendCode() {
    if (!pendingId || resendCooldown > 0) return;
    setVerifyError("");
    try {
      const res = await fetch("/api/direct-inquiry/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pendingId }),
      });
      const data = await res.json();
      if (data.success) {
        setResendCooldown(60);
        setVerifyCode("");
      } else {
        if (data.cooldown) setResendCooldown(data.cooldown);
        setVerifyError(data.error || "Nepavyko išsiųsti kodo");
      }
    } catch {
      setVerifyError("Tinklo klaida");
    }
  }

  function openInquiryForm() {
    setShowInquiry(true);
    setInquiryResult(null);
    setInquiryError("");
    setVerifyStep("form");
    setVerifyCode("");
    setVerifyError("");
    setPendingId(null);
    setTimeout(() => inquiryRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 100);
  }

  function closeInquiryForm() {
    setShowInquiry(false);
    setInquiryResult(null);
    setInquiryError("");
    setVerifyStep("form");
    setVerifyCode("");
    setVerifyError("");
    setPendingId(null);
  }

  return (
    <div id="zinute" ref={inquiryRef}>
      {!showInquiry && !inquiryResult?.success && (
        <InteractiveHoverButton icon={<Send className="h-4 w-4" />} onClick={openInquiryForm}>
          Rašyti žinutę
        </InteractiveHoverButton>
      )}

      {inquiryResult?.success && !showInquiry && (
        <Button size="sm" variant="outline" disabled>
          <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
          Žinutė išsiųsta
        </Button>
      )}

      {showInquiry && (
        <div className="mt-4 rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-heading-3 font-semibold text-surface-900 dark:text-white">
              <Send className="h-4 w-4 text-brand-500" />
              Žinutė tiekėjui {providerName}
            </h3>
            <button
              onClick={closeInquiryForm}
              className="rounded-lg p-1.5 text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-600 dark:hover:bg-surface-800 dark:hover:text-surface-300"
              aria-label="Uždaryti žinutės formą"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {inquiryResult?.success ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center dark:border-emerald-800/40 dark:bg-emerald-500/10">
              <CheckCircle className="mx-auto mb-2 h-8 w-8 text-emerald-500" />
              <p className="mb-1 text-body-sm font-medium text-emerald-800 dark:text-emerald-300">
                Žinutė išsiųsta!
              </p>
              <p className="mb-4 text-micro text-emerald-700/70 dark:text-emerald-400/70">
                Tiekėjas gaus jūsų žinutę ir galės su jumis susisiekti el. paštu.
              </p>
              <Button size="sm" variant="outline" onClick={closeInquiryForm}>
                Uždaryti
              </Button>
            </div>
          ) : !isLoggedIn && verifyStep === "needsLogin" ? (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-5 text-center dark:border-blue-800/40 dark:bg-blue-500/10">
              <LogIn className="mx-auto mb-2 h-8 w-8 text-blue-500" />
              <p className="mb-1 text-body-sm font-medium text-blue-800 dark:text-blue-300">
                Šis el. paštas jau registruotas
              </p>
              <p className="mb-4 text-micro text-blue-700/70 dark:text-blue-400/70">
                Prisijunkite prie savo paskyros, grįšite čia ir galėsite išsiųsti žinutę vienu paspaudimu.
              </p>
              <Link href={`/prisijungti?callbackUrl=${encodeURIComponent(`/tiekejai/${providerId}?inquiry=1`)}`}>
                <Button size="sm">
                  <LogIn className="h-4 w-4" />
                  Prisijungti
                </Button>
              </Link>
              <button
                onClick={() => {
                  setVerifyStep("form");
                  setInquiryError("");
                }}
                className="mx-auto mt-3 block text-micro text-surface-400 transition-colors hover:text-surface-600"
              >
                Naudoti kitą el. paštą
              </button>
            </div>
          ) : !isLoggedIn && verifyStep === "code" ? (
            <div>
              <div className="mb-4 rounded-xl border border-brand-200/60 bg-brand-50/50 p-4 dark:border-brand-800/40 dark:bg-brand-950/30">
                <div className="mb-1 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand-500" />
                  <p className="text-body-sm font-medium text-surface-900 dark:text-white">
                    Patvirtinimo kodas išsiųstas
                  </p>
                </div>
                <p className="text-micro text-surface-500 dark:text-surface-400">
                  Įveskite 6 skaitmenų kodą, išsiųstą adresu <span className="font-medium">{maskedEmail}</span>
                </p>
              </div>

              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-surface-700 dark:text-surface-300">
                    Patvirtinimo kodas
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    autoFocus
                    required
                    className="w-full rounded-xl border border-surface-200 bg-white px-4 py-3 text-center text-xl font-bold tracking-[0.3em] text-surface-900 placeholder:text-surface-300 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                  />
                </div>

                {verifyError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700 dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-300">
                    {verifyError}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={handleResendCode}
                    disabled={resendCooldown > 0}
                    className="inline-flex items-center gap-1.5 text-body-sm text-brand-600 transition-colors hover:text-brand-700 disabled:cursor-not-allowed disabled:text-surface-400 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {resendCooldown > 0 ? `Siųsti dar kartą (${resendCooldown}s)` : "Siųsti dar kartą"}
                  </button>
                  <Button type="submit" isLoading={verifyLoading} disabled={verifyLoading || verifyCode.length !== 6}>
                    Patvirtinti
                  </Button>
                </div>
              </form>

              <button
                onClick={() => {
                  setVerifyStep("form");
                  setPendingId(null);
                  setVerifyCode("");
                  setVerifyError("");
                }}
                className="mt-3 text-micro text-surface-400 transition-colors hover:text-surface-600"
              >
                Grįžti atgal
              </button>
            </div>
          ) : (
            <form onSubmit={isLoggedIn ? handleAuthSubmit : handleGuestInitiate} className="space-y-4">
              {!isLoggedIn && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-body-sm font-medium text-surface-700 dark:text-surface-300">
                      Jūsų vardas
                    </label>
                    <input
                      type="text"
                      value={inquiryForm.senderName}
                      onChange={(e) => setInquiryForm((f) => ({ ...f, senderName: e.target.value }))}
                      placeholder="Vardas"
                      className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-body-sm font-medium text-surface-700 dark:text-surface-300">
                      El. paštas <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={inquiryForm.senderEmail}
                      onChange={(e) => setInquiryForm((f) => ({ ...f, senderEmail: e.target.value }))}
                      placeholder="jusu@pastas.lt"
                      required
                      className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1 block text-body-sm font-medium text-surface-700 dark:text-surface-300">
                  Jūsų žinutė <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={inquiryForm.description}
                  onChange={(e) => setInquiryForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Aprašykite ko jums reikia — kokia paslauga, apimtis, terminai..."
                  required
                  minLength={20}
                  maxLength={2000}
                  className="w-full resize-none rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                />
                <p className="mt-1 text-micro text-surface-400">
                  {inquiryForm.description.length}/2000 (min. 20)
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-surface-700 dark:text-surface-300">
                    Biudžetas
                  </label>
                  <input
                    type="text"
                    value={inquiryForm.budget}
                    onChange={(e) => setInquiryForm((f) => ({ ...f, budget: e.target.value }))}
                    placeholder="pvz. 500-1000 €"
                    maxLength={100}
                    className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-body-sm font-medium text-surface-700 dark:text-surface-300">
                    Telefonas
                  </label>
                  <input
                    type="tel"
                    value={inquiryForm.senderPhone}
                    onChange={(e) => setInquiryForm((f) => ({ ...f, senderPhone: e.target.value }))}
                    placeholder="+370..."
                    maxLength={20}
                    className="w-full rounded-xl border border-surface-200 bg-white px-3 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-surface-700 dark:bg-surface-800 dark:text-white"
                  />
                </div>
              </div>

              {(inquiryError || (inquiryResult && !inquiryResult.success)) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700 dark:border-red-800/40 dark:bg-red-500/10 dark:text-red-300">
                  {inquiryError || inquiryResult?.message}
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <p className="max-w-[200px] text-micro text-surface-400 sm:max-w-none">
                  {isLoggedIn
                    ? "Tiekėjas gaus jūsų žinutę ir el. paštą"
                    : "Išsiųsime patvirtinimo kodą į jūsų el. paštą"}
                </p>
                <Button type="submit" isLoading={inquirySending} disabled={inquirySending}>
                  <Send className="h-4 w-4" />
                  {isLoggedIn ? "Siųsti" : "Tęsti"}
                </Button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
