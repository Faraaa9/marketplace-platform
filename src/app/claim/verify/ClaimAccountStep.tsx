"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { CheckCircle2, KeyRound, LogIn, Clock } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

interface ClaimAccountStepProps {
  token: string;
  email: string;
  supplierName: string;
  accountExists: boolean;
  claimStatus: string;
}

export default function ClaimAccountStep({
  token,
  email,
  supplierName,
  accountExists,
  claimStatus,
}: ClaimAccountStepProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  const dashboardPath = claimStatus === "approved" ? "/tiekejas/katalogas" : "/tiekejas";

  const loginHref = useMemo(() => {
    const params = new URLSearchParams({ email, callbackUrl: dashboardPath });
    return `/prisijungti?${params.toString()}`;
  }, [dashboardPath, email]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Slaptažodžiai nesutampa");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/claims/setup-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!data.success) {
        setError(data.error || "Nepavyko sukurti paskyros");
        return;
      }

      const redirectTo = data.data?.nextPath || dashboardPath;
      setNextPath(redirectTo);

      if (data.data?.accountStatus === "created") {
        const signInResult = await signIn("credentials", {
          email,
          password,
          redirect: false,
        });
        if (!signInResult?.error) {
          setSignedIn(true);
          // Auto-redirect to provider dashboard
          router.push(redirectTo);
          return;
        }
      }

      setCreated(true);
    } catch {
      setError("Įvyko klaida. Bandykite dar kartą.");
    } finally {
      setLoading(false);
    }
  }

  if (created || accountExists) {
    const resolvedPath = nextPath || dashboardPath;
    const isPending = claimStatus !== "approved";

    return (
      <div className="mt-8 rounded-lg border border-surface-200 bg-white p-5 text-left shadow-sm dark:border-surface-700 dark:bg-surface-900">
        <div className="flex gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isPending
              ? "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300"
              : "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300"
          }`}>
            {isPending ? <Clock className="h-5 w-5" /> : <CheckCircle2 className="h-5 w-5" />}
          </div>
          <div>
            <h2 className="text-body font-semibold text-surface-900 dark:text-white">
              {created ? "Tiekėjo paskyra paruošta" : "Paskyra su šiuo el. paštu jau yra"}
            </h2>
            <p className="mt-1 text-body-sm leading-relaxed text-surface-600 dark:text-surface-300">
              {isPending
                ? `Jūsų tiekėjo paskyra sukurta. „${supplierName}" perėmimo prašymas laukia administratoriaus peržiūros. Kai patvirtinsime, gausite laišką ir galėsite valdyti profilį tiekėjo panelėje.`
                : `„${supplierName}" jau patvirtintas. Prisijunkite ir galėsite valdyti profilį tiekėjo panelėje.`}
            </p>
            {signedIn && (
              <p className="mt-2 text-body-sm font-medium text-emerald-700 dark:text-emerald-300">
                Esate prijungti kaip tiekėjas su {email}. Nukreipiame...
              </p>
            )}
            {isPending && !signedIn && (
              <p className="mt-2 text-body-sm text-surface-500 dark:text-surface-400">
                Jokio papildomo „tapti tiekėju" žingsnio nereikia — jūsų paskyra jau tiekėjo tipo.
              </p>
            )}
          </div>
        </div>
        {!signedIn && (
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <Link
              href={loginHref}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <LogIn className="h-4 w-4" />
              Prisijungti į tiekėjo panelę
            </Link>
            <Link
              href="/slaptazodis"
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-surface-200 px-4 text-body-sm font-semibold text-surface-700 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
            >
              Pamiršau slaptažodį
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-lg border border-brand-100 bg-white p-5 text-left shadow-sm dark:border-brand-500/20 dark:bg-surface-900">
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300">
          <KeyRound className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-body font-semibold text-surface-900 dark:text-white">
            Sukurkite tiekėjo paskyrą
          </h2>
          <p className="mt-1 text-body-sm leading-relaxed text-surface-600 dark:text-surface-300">
            El. paštas {email} patvirtintas. Susikurkite slaptažodį — paskyra bus iš karto tiekėjo tipo. Po administratoriaus patvirtinimo galėsite valdyti „{supplierName}" profilį.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreateAccount} className="mt-5 space-y-4">
        <Input
          id="claim-name"
          label="Jūsų vardas"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Vardas Pavardė"
          required
        />
        <Input
          id="claim-password"
          label="Slaptažodis"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Bent 8 simboliai"
          required
        />
        <Input
          id="claim-confirm-password"
          label="Pakartokite slaptažodį"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Pakartokite slaptažodį"
          required
        />

        {error && (
          <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-body-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </p>
        )}

        <Button type="submit" isLoading={loading} className="min-h-11 w-full rounded-lg">
          Sukurti tiekėjo paskyrą
        </Button>

        <p className="text-micro text-surface-400 text-center">
          Papildomo „tapti tiekėju" žingsnio nereikės
        </p>
      </form>
    </div>
  );
}
