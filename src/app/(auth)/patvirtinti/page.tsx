"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import { getRoleHomePath } from "@/lib/redirects";

function resolvePostVerifyPath(intent: string | null, role?: string) {
  if (intent === "provider" && role !== "PROVIDER" && role !== "ADMIN") {
    return "/tapti-tiekeju";
  }
  return getRoleHomePath(role);
}

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

function VerifySuccessScreen({
  maskedEmail,
  intent,
}: {
  maskedEmail: string;
  intent: string | null;
}) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const role = session?.user?.role;
  const redirectPath = resolvePostVerifyPath(intent, role);
  const [countdown, setCountdown] = useState(4);

  const ctaLabel = intent === "provider"
    ? "Tęsti į tiekėjo aktyvavimą"
    : role === "PROVIDER"
      ? "Tęsti į tiekėjo panelę"
      : "Tęsti toliau";

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          router.push(redirectPath);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isAuthenticated, redirectPath, router]);

  const wrapper = "relative flex min-h-[85vh] items-center justify-center px-4";
  const card = "rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90";

  return (
    <div className={wrapper}>
      <div className="relative w-full max-w-md text-center">
        <div className={card}>
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
            <span className="text-display font-bold text-emerald-500">✓</span>
          </div>
          <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">El. paštas patvirtintas!</h1>
          <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
            {maskedEmail
              ? `El. paštas ${maskedEmail} sėkmingai patvirtintas.`
              : "Jūsų el. pašto adresas sėkmingai patvirtintas."}
            {isAuthenticated
              ? " Tuoj būsite nukreipti automatiškai."
              : " Dabar galite prisijungti ir tęsti darbą platformoje."}
          </p>
          {isAuthenticated ? (
            <>
              <Link
                href={redirectPath}
                className="mt-6 inline-flex rounded-2xl bg-brand-600 px-6 py-3 text-body-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm"
              >
                {ctaLabel}
              </Link>
              <p className="mt-3 text-micro text-surface-400">
                Automatinis nukreipimas po {countdown} sek.
              </p>
            </>
          ) : (
            <>
              <p className="mt-4 text-body-sm text-surface-500 dark:text-surface-400">
                Jei langas, kuriame pradėjote registraciją, dar atidarytas — ten prisijungsime automatiškai.
              </p>
              <Link
                href="/prisijungti"
                className="mt-6 inline-flex rounded-2xl bg-brand-600 px-6 py-3 text-body-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm"
              >
                Prisijungti čia
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const email = searchParams.get("email");
  const delivery = searchParams.get("delivery");
  const intent = searchParams.get("intent");
  const isMock = searchParams.get("mock") === "1";
  const maskedEmail = maskEmail(email);

  const wrapper = "relative flex min-h-[85vh] items-center justify-center px-4";
  const card = "rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90";

  if (status === "success") {
    return <VerifySuccessScreen maskedEmail={maskedEmail} intent={intent} />;
  }

  if (status === "expired") {
    return (
      <div className={wrapper}>
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

  // Default: "check your inbox" — with background polling so the original tab
  // auto-signs-in once the email link is clicked in another tab.
  return (
    <WaitingForVerificationScreen
      email={email}
      maskedEmail={maskedEmail}
      delivery={delivery}
      intent={intent}
      isMock={isMock}
    />
  );
}

function WaitingForVerificationScreen({
  email,
  maskedEmail,
  delivery,
  intent,
  isMock,
}: {
  email: string | null;
  maskedEmail: string;
  delivery: string | null;
  intent: string | null;
  isMock: boolean;
}) {
  const router = useRouter();
  const [autoState, setAutoState] = useState<
    "idle" | "polling" | "verified" | "signing-in" | "expired" | "failed"
  >("idle");
  const signinTokenRef = useRef<string | null>(null);
  const intentRef = useRef<string | null>(intent);
  intentRef.current = intent;

  // Boot polling: pick up the signin token planted by /registruotis and ask
  // the server every 3s whether email verification has landed.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let token: string | null = null;
    try {
      token = sessionStorage.getItem("pendingSignInToken");
    } catch {
      token = null;
    }
    if (!token) return;
    signinTokenRef.current = token;
    setAutoState("polling");

    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch(
          `/api/auth/check-verified?signinToken=${encodeURIComponent(token)}`,
          { cache: "no-store" }
        );
        if (cancelled) return;
        const data = await res.json().catch(() => ({}));
        if (data.expired) {
          setAutoState("expired");
          return;
        }
        if (data.verified) {
          setAutoState("verified");
        }
      } catch {
        // Network blip — keep polling silently.
      }
    };

    tick();
    const interval = setInterval(tick, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // Once verified, show the success card briefly, then mint a session via the
  // one-time signin token and route the user onward.
  useEffect(() => {
    if (autoState !== "verified") return;
    const token = signinTokenRef.current;
    if (!token) return;

    const timeout = setTimeout(async () => {
      setAutoState("signing-in");
      const result = await signIn("credentials", {
        signinToken: token,
        redirect: false,
      });
      try {
        sessionStorage.removeItem("pendingSignInToken");
      } catch {
        // ignore
      }
      if (!result || result.error) {
        setAutoState("failed");
        return;
      }
      // Role will be reflected in the destination page's session — for the
      // post-verify hop we only need the intent, which decides /tapti-tiekeju
      // vs the default landing.
      const next = resolvePostVerifyPath(intentRef.current, undefined);
      router.push(next);
      router.refresh();
    }, 2000);

    return () => clearTimeout(timeout);
  }, [autoState, router]);

  const wrapper = "relative flex min-h-[85vh] items-center justify-center px-4";
  const card = "rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90";

  if (autoState === "verified" || autoState === "signing-in") {
    return (
      <div className={wrapper}>
        <div className="relative w-full max-w-md text-center">
          <div className={card}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
              <span className="text-display font-bold text-emerald-500">✓</span>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">El. paštas patvirtintas!</h1>
            <p className="mt-2 text-body text-surface-500 dark:text-surface-400">
              {maskedEmail
                ? `${maskedEmail} sėkmingai patvirtintas. Prisijungiame ir tęsiame...`
                : "Sėkmingai patvirtinta. Prisijungiame ir tęsiame..."}
            </p>
            <div className="mt-6 flex justify-center">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={wrapper}>
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
          {autoState === "polling" && (
            <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2 text-body-sm text-brand-700 dark:border-brand-800 dark:bg-brand-500/10 dark:text-brand-300">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-brand-500" />
              Laukiame patvirtinimo — kai paspausite nuorodą, prisijungsime automatiškai.
            </div>
          )}
          {autoState === "expired" && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-left text-body-sm text-amber-800 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
              Automatinio prisijungimo sesija pasibaigė. Patvirtinkite el. paštą ir prisijunkite žemiau esančia nuoroda.
            </div>
          )}
          {autoState === "failed" && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-body-sm text-red-700 dark:border-red-700 dark:bg-red-500/10 dark:text-red-300">
              Automatinis prisijungimas nepavyko. Patvirtinkite el. paštą ir prisijunkite rankiniu būdu.
            </div>
          )}
          <div className="mt-4 rounded-xl border border-surface-200 bg-surface-50 p-4 text-left dark:border-surface-700 dark:bg-surface-800/60">
            <p className="text-body-sm font-medium text-surface-900 dark:text-white">Kas toliau:</p>
            <ul className="mt-2 space-y-1 text-body-sm text-surface-600 dark:text-surface-300">
              <li>• Atidarykite laišką pagrindinėje, spam arba reklamų skiltyje</li>
              <li>• Paspauskite patvirtinimo nuorodą</li>
              <li>• Šis langas pats prisijungs — nereikia nieko vesti</li>
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
