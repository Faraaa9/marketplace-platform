"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";

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

    if (password.length < 6) {
      setError("Slaptažodis turi būti bent 6 simbolių");
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
      <div className="flex min-h-[80vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Neteisinga nuoroda</h1>
          <p className="mt-2 text-body text-surface-500">Ši nuoroda negalioja arba pasibaigė.</p>
          <Link href="/slaptazodis" className="mt-4 inline-block text-brand-600 hover:text-brand-700 font-medium">
            Prašyti naujos nuorodos
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-surface-200/60 bg-white p-8 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="text-center mb-8">
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
                className="mt-4 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-body-sm font-medium text-white hover:bg-brand-700 transition-colors"
              >
                Prisijungti
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
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
                  placeholder="Bent 6 simboliai"
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
