"use client";

import { useState } from "react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setSent(true);
      } else {
        setError(data.error || "Įvyko klaida");
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
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Pamiršote slaptažodį?</h1>
            <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
              Įveskite el. paštą ir atsiųsime atstatymo nuorodą
            </p>
          </div>

          {sent ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 dark:bg-emerald-500/10">
                <span className="text-display font-bold text-emerald-500">✓</span>
              </div>
              <p className="text-body text-surface-700 dark:text-surface-300">
                Jei šis el. paštas yra registruotas, atsiųsime slaptažodžio atstatymo nuorodą.
              </p>
              <p className="mt-2 text-body-sm text-surface-500">Patikrinkite savo el. paštą.</p>
              <Link href="/prisijungti" className="mt-6 inline-block text-body-sm text-brand-600 hover:text-brand-700 font-medium">
                Grįžti į prisijungimą
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
                  id="email"
                  label="El. paštas"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="jusu@pastas.lt"
                />
                <Button type="submit" isLoading={loading} className="w-full">
                  Siųsti atstatymo nuorodą
                </Button>
              </form>

              <p className="mt-6 text-center text-body-sm text-surface-500 dark:text-surface-400">
                <Link href="/prisijungti" className="text-brand-600 hover:text-brand-700 font-medium transition-colors dark:text-brand-400">
                  Grįžti į prisijungimą
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
