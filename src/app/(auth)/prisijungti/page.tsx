"use client";

import { Suspense, useEffect, useState } from "react";
import { getSession, signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");
  const emailParam = searchParams.get("email") || "";
  const { data: session, status } = useSession();
  const [email, setEmail] = useState(emailParam);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getRedirectPath(role?: string) {
    const homePath = getRoleHomePath(role);
    const safeCallbackPath = getSafeCallbackPath(callbackUrl);

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

          <div className="mb-5 space-y-3">
            <GoogleSignInButton callbackUrl={callbackUrl} />
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
