"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-surface-200/60 bg-white p-8 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Prisijungimas</h1>
            <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">Sveiki sugrįžę!</p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
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

          <p className="mt-6 text-center text-body-sm text-surface-500 dark:text-surface-400">
            Esate paslaugų tiekėjas?{" "}
            <Link href="/registruotis" className="text-brand-600 hover:text-brand-700 font-medium transition-colors dark:text-brand-400 dark:hover:text-brand-300">
              Registruokitės čia
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
