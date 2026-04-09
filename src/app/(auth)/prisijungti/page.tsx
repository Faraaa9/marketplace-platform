"use client";

import { useEffect, useState } from "react";
import { getSession, signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { getRoleHomePath } from "@/lib/redirects";
import { Particles } from "@/components/magicui/particles";

export default function LoginPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(getRoleHomePath(session?.user?.role));
    }
  }, [router, session?.user?.role, status]);

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
        const refreshedSession = await getSession();
        router.push(getRoleHomePath(refreshedSession?.user?.role));
        router.refresh();
      }
    } catch {
      setError("Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4">
      <div className="absolute inset-0 bg-radial-brand-subtle" />
      <Particles className="opacity-15" quantity={25} color="#6366f1" size={1} speed={0.1} />

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
