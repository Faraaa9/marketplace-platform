"use client";

import { Suspense, useEffect, useState } from "react";
import { getSession, signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { QrCode, RefreshCw, Send } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { getRoleHomePath } from "@/lib/redirects";

function getSafeCallbackPath(callbackUrl: string | null) {
  if (!callbackUrl) return null;

  try {
    const parsed = new URL(callbackUrl, window.location.origin);
    if (parsed.origin !== window.location.origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function normalizeCallbackPath(path: string | null) {
  if (!path) return null;
  if (path.startsWith("/tiekejas/atsakymai")) return "/tiekejas/pasiulymai";
  return path;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

// Server-prerenderable shell so the static (no-JS) HTML carries a real <h1>
// and intro copy for crawlers. Replaced by the live form on hydration.
function LoginShell() {
  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/20">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Prisijungimas</h1>
            <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">Sveiki sugrįžę!</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const emailParam = searchParams.get("email") || "";
  const { data: session, status } = useSession();
  const normalizedCallbackUrl = normalizeCallbackPath(getSafeCallbackPath(callbackUrl));
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getRedirectPath(role?: string) {
    const homePath = getRoleHomePath(role);
    const safeCallbackPath = normalizeCallbackPath(getSafeCallbackPath(callbackUrl));

    if (!safeCallbackPath) return homePath;

    if (role === "ADMIN") {
      return safeCallbackPath.startsWith("/admin") ? safeCallbackPath : homePath;
    }

    if (role === "PROVIDER") {
      return safeCallbackPath.startsWith("/admin") ? homePath : safeCallbackPath;
    }

    if (
      safeCallbackPath.startsWith("/admin") ||
      safeCallbackPath.startsWith("/tiekejas") ||
      safeCallbackPath.startsWith("/tiekėjas")
    ) {
      return homePath;
    }

    return safeCallbackPath;
  }

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(getRedirectPath(session?.user?.role));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, session?.user?.role, status]);

  async function getFreshSessionRole() {
    for (let attempt = 0; attempt < 5; attempt++) {
      const refreshedSession = await getSession();
      if (refreshedSession?.user?.role) return refreshedSession.user.role;
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
    return undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        const role = await getFreshSessionRole();
        const redirectPath = getRedirectPath(role);
        router.replace(redirectPath);
        router.refresh();
        window.location.replace(redirectPath);
      }
    } catch {
      setError("Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  if (status === "authenticated") {
    return (
      <div className="relative flex min-h-[85vh] items-center justify-center px-4">
        <div className="relative rounded-2xl border border-surface-200/60 bg-white/90 p-8 text-center shadow-elevated backdrop-blur-sm dark:border-surface-700/50 dark:bg-surface-900/90">
          <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/20">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <p className="text-body font-semibold text-surface-900 dark:text-white">
            Prisijungta
          </p>
          <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
            Nukreipiame jus į paskyrą...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/20">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Prisijungimas</h1>
            <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">Sveiki sugrįžę!</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
              {error}
            </div>
          )}

          <TelegramQrLogin
            callbackUrl={normalizedCallbackUrl}
            onError={setError}
            getRedirectPath={getRedirectPath}
            getFreshSessionRole={getFreshSessionRole}
          />

          <div className="mb-5 space-y-3">
            <GoogleSignInButton callbackUrl={normalizedCallbackUrl} />
          </div>

          <div className="relative mb-5 flex items-center">
            <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
            <span className="px-3 text-micro uppercase tracking-wider text-surface-400">arba</span>
            <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              label="El. paštas"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="jusu@pastas.lt"
            />
            <Input
              id="password"
              label="Slaptažodis"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
            />
            <Button type="submit" isLoading={loading} className="w-full">
              Prisijungti
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/slaptazodis" className="text-body-sm text-surface-500 hover:text-brand-600 transition-colors dark:text-surface-400 dark:hover:text-brand-400">
              Pamiršote slaptažodį?
            </Link>
          </div>

          <div className="mt-6 pt-6 border-t border-surface-100 dark:border-surface-800">
            <p className="text-center text-body-sm text-surface-500 dark:text-surface-400">
              Neturite paskyros?{" "}
              <Link href="/registruotis" className="text-brand-600 hover:text-brand-700 font-medium transition-colors dark:text-brand-400 dark:hover:text-brand-300">
                Registruokitės
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

interface TelegramLoginChallenge {
  token: string;
  deepLink: string;
  qrLink?: string;
  qrDataUrl: string;
  expiresInSeconds: number;
}

function TelegramQrLogin({
  callbackUrl,
  onError,
  getRedirectPath,
  getFreshSessionRole,
}: {
  callbackUrl: string | null;
  onError: (message: string) => void;
  getRedirectPath: (role?: string) => string;
  getFreshSessionRole: () => Promise<string | undefined>;
}) {
  const router = useRouter();
  const [challenge, setChallenge] = useState<TelegramLoginChallenge | null>(null);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"loading" | "ready" | "waiting" | "signing" | "expired" | "error">("loading");
  const [message, setMessage] = useState("");

  async function createChallenge() {
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/auth/telegram-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callbackUrl }),
      });
      const data = await res.json();
      if (!data.success) {
        setStatus("error");
        setMessage(data.error || "Telegram prisijungimas laikinai nepasiekiamas");
        return;
      }
      setChallenge(data.data);
      setStatus("ready");
    } catch {
      setStatus("error");
      setMessage("Nepavyko paruošti Telegram prisijungimo");
    }
  }

  useEffect(() => {
    if (!open || challenge) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-open init; the synchronous "loading" status is intentional UI feedback
    createChallenge();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callbackUrl, challenge, open]);

  useEffect(() => {
    if (!challenge?.token || status === "signing" || status === "expired") return;

    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        const res = await fetch(`/api/auth/telegram-login?token=${encodeURIComponent(challenge.token)}`);
        const data = await res.json();
        if (cancelled) return;

        // 404 = challenge gone or bound to another tab/browser: start over.
        if (res.status === 404 || data.data?.status === "EXPIRED") {
          setStatus("expired");
          setMessage("QR kodas nebegalioja. Sugeneruokite naują.");
          return;
        }

        if (data.data.confirmed && data.data.telegramLoginToken) {
          setStatus("signing");
          const result = await signIn("credentials", {
            telegramLoginToken: data.data.telegramLoginToken,
            redirect: false,
          });
          if (result?.error) {
            setStatus("error");
            onError(result.error);
            return;
          }
          const role = await getFreshSessionRole();
          const redirectPath = getRedirectPath(role);
          router.replace(redirectPath);
          router.refresh();
          window.location.replace(redirectPath);
        }
      } catch {
        // Keep polling; transient network errors should not force a restart.
      }
    }, 1800);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [challenge?.token, getFreshSessionRole, getRedirectPath, onError, router, status]);

  return (
    <div className="mb-5">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-surface-200 bg-white px-4 text-body-sm font-semibold text-surface-700 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:bg-surface-900 dark:text-surface-100 dark:hover:bg-surface-800"
      >
        <Send className="h-4 w-4 text-[#229ED9]" />
        Prisijungti su Telegram
      </button>

      {open && (
        <div className="mt-3 rounded-2xl border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/50">
          <div className="grid gap-4 sm:grid-cols-[176px_minmax(0,1fr)]">
            <div className="grid aspect-square place-items-center rounded-xl border border-surface-200 bg-white p-2 dark:border-surface-700">
              {challenge?.qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={challenge.qrDataUrl} alt="Telegram prisijungimo QR kodas" className="h-full w-full" />
              ) : (
                <QrCode className="h-10 w-10 text-surface-300" />
              )}
            </div>
            <div className="flex min-w-0 flex-col justify-center gap-2">
              <p className="text-body-sm text-surface-600 dark:text-surface-300">
                {status === "loading"
                  ? "Ruošiame QR kodą..."
                  : status === "signing"
                    ? "Prisijungiame..."
                    : status === "expired"
                      ? "QR kodas baigė galioti."
                      : status === "error"
                        ? message
                        : "Nuskenuokite QR ir patvirtinkite bot'e."}
              </p>
              <div className="flex flex-wrap gap-2">
                {challenge?.deepLink && (
                  <a
                    href={challenge.deepLink}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#229ED9] px-4 text-body-sm font-semibold text-white transition-colors hover:bg-[#1b8cc2]"
                    onClick={() => setStatus("waiting")}
                  >
                    <Send className="h-4 w-4" />
                    Atidaryti Telegram
                  </a>
                )}
                <button
                  type="button"
                  onClick={createChallenge}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-surface-200 px-4 text-body-sm font-semibold text-surface-700 transition-colors hover:bg-white dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
                >
                  <RefreshCw className="h-4 w-4" />
                  Naujas QR
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
