"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import { Particles } from "@/components/magicui/particles";

export default function VerifyEmailPage() {
  return <Suspense fallback={<LoadingSpinner />}><VerifyEmailContent /></Suspense>;
}

function maskEmail(email?: string | null) {
  if (!email || !email.includes("@")) return "";
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] || ""}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function ResendButton({ email }: { email?: string }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [inputEmail, setInputEmail] = useState(email || "");

  async function handleResend() {
    if (!inputEmail) return;
    setError("");
    setSending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inputEmail }),
      });
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
    <div className="mt-6 space-y-3">
      {!email && (
        <input
          type="email"
          placeholder="Jūsų el. paštas"
          value={inputEmail}
          onChange={(e) => setInputEmail(e.target.value)}
          className="w-full rounded-xl border border-surface-300 bg-white px-3 py-2.5 text-body-sm ring-1 ring-transparent focus:border-brand-500 focus:ring-brand-500 focus:outline-none transition-colors dark:border-surface-600 dark:bg-surface-800 dark:text-white"
        />
      )}
      <Button onClick={handleResend} isLoading={sending} variant="outline" className="w-full" disabled={!inputEmail}>
        Siųsti naują patvirtinimo nuorodą
      </Button>
      {sent && (
        <p className="text-body-sm text-emerald-600 dark:text-emerald-400">
          Patvirtinimo laiškas išsiųstas. Patikrinkite pašto dėžutę ir spam aplanką.
        </p>
      )}
      {error && (
        <p className="text-body-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const email = searchParams.get("email");
  const delivery = searchParams.get("delivery");
  const isMock = searchParams.get("mock") === "1";
  const maskedEmail = maskEmail(email);

  const wrapper = "relative flex min-h-[85vh] items-center justify-center px-4";
  const card = "rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90";

  if (status === "success") {
    return (
      <div className={wrapper}>
        <div className="absolute inset-0 bg-radial-brand-subtle" />
        <Particles className="opacity-10" quantity={20} color="#10b981" size={1} speed={0.1} />
        <div className="relative w-full max-w-md text-center">
          <div className={card}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
              <span className="text-display font-bold text-emerald-500">✓</span>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">El. paštas patvirtintas!</h1>
            <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
              {maskedEmail
                ? `El. paštas ${maskedEmail} sėkmingai patvirtintas.`
                : "Jūsų el. pašto adresas sėkmingai patvirtintas."} Dabar galite prisijungti ir tęsti darbą platformoje.
            </p>
            <Link
              href="/prisijungti"
              className="mt-6 inline-flex rounded-2xl bg-brand-600 px-6 py-3 text-body-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm"
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
      <div className={wrapper}>
        <div className="absolute inset-0 bg-radial-brand-subtle" />
        <div className="relative w-full max-w-md text-center">
          <div className={card}>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Nuoroda nebegalioja</h1>
            <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
              {maskedEmail
                ? `Ši patvirtinimo nuoroda ${maskedEmail} adresui nebegalioja.`
                : "Ši patvirtinimo nuoroda nebegalioja."} Išsiųskite naują laišką ir pabandykite dar kartą.
            </p>
            <ResendButton email={email || undefined} />
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={wrapper}>
        <div className="absolute inset-0 bg-radial-brand-subtle" />
        <div className="relative w-full max-w-md text-center">
          <div className={card}>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Įvyko klaida</h1>
            <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
              Nepavyko patvirtinti el. pašto adreso. Galite pabandyti išsiųsti naują patvirtinimo nuorodą.
            </p>
            <ResendButton email={email || undefined} />
          </div>
        </div>
      </div>
    );
  }

  // Default: check your email message (shown after registration)
  return (
    <div className={wrapper}>
      <div className="absolute inset-0 bg-radial-brand-subtle" />
      <Particles className="opacity-10" quantity={20} color="#6366f1" size={1} speed={0.1} />
      <div className="relative w-full max-w-md text-center">
        <div className={card}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
            <span className="text-display font-bold text-brand-500">✉</span>
          </div>
          <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">
            {delivery === "failed" ? "Paskyra sukurta, bet laiškas neišsiųstas" : "Patikrinkite el. paštą"}
          </h1>
          <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
            {delivery === "failed"
              ? `${maskedEmail ? `Paskyra ${maskedEmail} adresui sukurta, bet patvirtinimo laiško išsiųsti nepavyko.` : "Paskyra sukurta, bet patvirtinimo laiško išsiųsti nepavyko."} Galite pabandyti dar kartą žemiau.`
              : `${maskedEmail ? `Išsiuntėme patvirtinimo nuorodą į ${maskedEmail}.` : "Išsiuntėme patvirtinimo nuorodą į jūsų el. pašto adresą."} Spauskite nuorodą laiške, kad patvirtintumėte paskyrą.`}
          </p>
          {isMock && (
            <div className="mt-4 rounded-xl border border-brand-200 bg-brand-50 p-3 text-left text-body-sm text-brand-800 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              Veikiate development režime: laiškas neišėjo į realų paštą, bet testinę nuorodą rasite dev email preview.
            </div>
          )}
          <div className="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-4 text-left dark:border-surface-700 dark:bg-surface-800/60">
            <p className="text-body-sm font-medium text-surface-900 dark:text-white">Kas toliau:</p>
            <ul className="mt-2 space-y-1 text-body-sm text-surface-600 dark:text-surface-300">
              <li>• Atidarykite laišką pagrindinėje, spam arba reklamų skiltyje</li>
              <li>• Paspauskite patvirtinimo nuorodą</li>
              <li>• Po patvirtinimo galėsite saugiai prisijungti ir naudotis paskyra</li>
            </ul>
          </div>
          <ResendButton email={email || undefined} />
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
