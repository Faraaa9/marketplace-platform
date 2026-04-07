"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Slaptažodžiai nesutampa");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password }),
      });

      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Registracija nepavyko");
        return;
      }

      // Auto-login
      await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      router.push("/tiekėjas");
      router.refresh();
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
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Tiekėjo registracija</h1>
            <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
              Sukurkite paskyrą ir pradėkite gauti užklausas
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="name"
              label="Vardas / Įmonės pavadinimas"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="Jonas Jonaitis"
            />
            <Input
              id="email"
              label="El. paštas"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
              placeholder="jusu@pastas.lt"
            />
            <Input
              id="password"
              label="Slaptažodis"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              placeholder="Bent 6 simboliai"
            />
            <Input
              id="confirmPassword"
              label="Pakartokite slaptažodį"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              required
              placeholder="••••••••"
            />
            <Button type="submit" isLoading={loading} className="w-full">
              Registruotis
            </Button>
          </form>

          <p className="mt-6 text-center text-body-sm text-surface-500 dark:text-surface-400">
            Jau turite paskyrą?{" "}
            <Link href="/prisijungti" className="text-brand-600 hover:text-brand-700 font-medium transition-colors dark:text-brand-400 dark:hover:text-brand-300">
              Prisijunkite
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
