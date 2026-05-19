"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import GoogleSignInButton from "@/components/auth/GoogleSignInButton";
import { getRoleHomePath } from "@/lib/redirects";
import { LazyParticles as Particles } from "@/components/magicui/lazy";
import { CheckCircle2 } from "lucide-react";

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const { data: session, status } = useSession();
  const [form, setForm] = useState({ name: "", email: emailParam, password: "", confirmPassword: "" });
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

      const params = new URLSearchParams({
        email: form.email,
        delivery: data.data?.emailSent ? "sent" : "failed",
      });
      if (data.data?.emailMock) {
        params.set("mock", "1");
      }
      router.push(`/patvirtinti?${params.toString()}`);
      router.refresh();
    } catch {
      setError("Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-radial-brand-subtle" />
      <Particles className="opacity-15" quantity={25} color="#6366f1" size={1} speed={0.1} />

      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-surface-200/60 bg-white/90 backdrop-blur-sm p-8 shadow-elevated dark:border-surface-700/50 dark:bg-surface-900/90">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 h-12 w-12 rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-600/20">
              <span className="text-white font-bold text-lg">P</span>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">Sukurti paskyrą</h1>
            <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
              Pateikite užklausas arba tapkite tiekėju
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="mb-5 space-y-3">
            <GoogleSignInButton label="Registruotis su Google" />
          </div>

          <div className="relative mb-5 flex items-center">
            <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
            <span className="px-3 text-micro uppercase tracking-wider text-surface-400">arba</span>
            <div className="flex-1 border-t border-surface-200 dark:border-surface-700" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="name"
              label="Vardas"
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
              placeholder="Bent 8 simboliai"
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

          {/* Trust indicators */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-micro text-surface-400">
            {["Nemokama", "Be įsipareigojimų"].map((text) => (
              <div key={text} className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                <span>{text}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 pt-6 border-t border-surface-100 dark:border-surface-800">
            <p className="text-center text-body-sm text-surface-500 dark:text-surface-400">
              Jau turite paskyrą?{" "}
              <Link href="/prisijungti" className="text-brand-600 hover:text-brand-700 font-medium transition-colors dark:text-brand-400 dark:hover:text-brand-300">
                Prisijunkite
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
