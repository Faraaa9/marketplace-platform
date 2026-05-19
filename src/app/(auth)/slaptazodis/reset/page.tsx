"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { LazyParticles as Particles } from "@/components/magicui/lazy";

export default function ResetPasswordPage() {
  return <Suspense fallback={<LoadingSpinner />}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Slaptažodžiai nesutampa");
      return;
    }

    if (password.length < 8) {
      setError("Slaptažodis turi būti bent 8 simbolių");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess(true);
      } else {
        setError(data.error || "Įvyko klaida");
      }
    } catch {
      setError("Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="relative flex min-h-[85vh] items-center justify-center px-4">
        <div className="absolute inset-0 bg-radial-brand-subtle" />
        <div className="relative text-center">
          <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Neteisinga nuoroda</h1>
          <p className="mt-2 text-body text-surface-500">Ši nuoroda negalioja arba pasibaigė.</p>
          <Link href="/slaptazodis" className="mt-4 inline-block text-brand-600 hover:text-brand-700 font-medium transition-colors">
            Prašyti naujos nuorodos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4">
      <div className="absolute inset-0 bg-radial-brand-subtle" />
      <Particles className="opacity-15" quantity={20} color="#6366f1" size={1} speed={0.1} />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/20">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Naujas slaptažodis</h1>
            <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
              Įveskite naują slaptažodį
            </p>
          </div>

          {success ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                <span className="text-display font-bold text-emerald-500">✓</span>
              </div>
              <p className="text-body text-surface-700 dark:text-surface-300">
                Slaptažodis sėkmingai pakeistas!
              </p>
              <Link
                href="/prisijungti"
                className="mt-4 inline-flex rounded-2xl bg-brand-600 px-6 py-3 text-body-sm font-medium text-white hover:bg-brand-700 transition-colors shadow-sm"
              >
                Prisijungti
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <Input
                  id="password"
                  label="Naujas slaptažodis"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Bent 8 simboliai"
                />
                <Input
                  id="confirmPassword"
                  label="Pakartokite slaptažodį"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <Button type="submit" isLoading={loading} className="w-full">
                  Atstatyti slaptažodį
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
