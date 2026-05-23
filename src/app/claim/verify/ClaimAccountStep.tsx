&rdquo;use client&rdquo;;

import { useMemo, useState } from &rdquo;react&rdquo;;
import Link from &rdquo;next/link&rdquo;;
import { useRouter } from &rdquo;next/navigation&rdquo;;
import { signIn } from &rdquo;next-auth/react&rdquo;;
import { CheckCircle2, KeyRound, LogIn, Clock } from &rdquo;lucide-react&rdquo;;
import Button from &rdquo;@/components/ui/Button&rdquo;;
import Input from &rdquo;@/components/ui/Input&rdquo;;

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
  const [name, setName] = useState(&rdquo;&rdquo;);
  const [password, setPassword] = useState(&rdquo;&rdquo;);
  const [confirmPassword, setConfirmPassword] = useState(&rdquo;&rdquo;);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(&rdquo;&rdquo;);
  const [created, setCreated] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [nextPath, setNextPath] = useState<string | null>(null);

  const dashboardPath = claimStatus === &rdquo;approved&rdquo; ? &rdquo;/tiekejas/katalogas&rdquo; : &rdquo;/tiekejas&rdquo;;

  const loginHref = useMemo(() => {
    const params = new URLSearchParams({ email, callbackUrl: dashboardPath });
    return `/prisijungti?${params.toString()}`;
  }, [dashboardPath, email]);

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(&rdquo;&rdquo;);

    if (password !== confirmPassword) {
      setError(&rdquo;Slaptažodžiai nesutampa&rdquo;);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(&rdquo;/api/claims/setup-account&rdquo;, {
        method: &rdquo;POST&rdquo;,
        headers: { &rdquo;Content-Type&rdquo;: &rdquo;application/json&rdquo; },
        body: JSON.stringify({ token, name, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!data.success) {
        setError(data.error || &rdquo;Nepavyko sukurti paskyros&rdquo;);
        return;
      }

      const redirectTo = data.data?.nextPath || dashboardPath;
      setNextPath(redirectTo);

      if (data.data?.accountStatus === &rdquo;created&rdquo;) {
        const signInResult = await signIn(&rdquo;credentials&rdquo;, {
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
      setError(&rdquo;Įvyko klaida. Bandykite dar kartą.&rdquo;);
    } finally {
      setLoading(false);
    }
  }

  if (created || accountExists) {
    const resolvedPath = nextPath || dashboardPath;
    const isPending = claimStatus !== &rdquo;approved&rdquo;;

    return (
      <div className=&rdquo;mt-8 rounded-lg border border-surface-200 bg-white p-5 text-left shadow-sm dark:border-surface-700 dark:bg-surface-900&rdquo;>
        <div className=&rdquo;flex gap-3&rdquo;>
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            isPending
              ? &rdquo;bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-300&rdquo;
              : &rdquo;bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300&rdquo;
          }`}>
            {isPending ? <Clock className=&rdquo;h-5 w-5&rdquo; /> : <CheckCircle2 className=&rdquo;h-5 w-5&rdquo; />}
          </div>
          <div>
            <h2 className=&rdquo;text-body font-semibold text-surface-900 dark:text-white&rdquo;>
              {created ? &rdquo;Tiekėjo paskyra paruošta&rdquo; : &rdquo;Paskyra su šiuo el. paštu jau yra&rdquo;}
            </h2>
            <p className=&rdquo;mt-1 text-body-sm leading-relaxed text-surface-600 dark:text-surface-300&rdquo;>
              {isPending
                ? `Jūsų tiekėjo paskyra sukurta. &ldquo;${supplierName}&rdquo; perėmimo prašymas laukia administratoriaus peržiūros. Kai patvirtinsime, gausite laišką ir galėsite valdyti profilį tiekėjo panelėje.`
                : `&ldquo;${supplierName}&rdquo; jau patvirtintas. Prisijunkite ir galėsite valdyti profilį tiekėjo panelėje.`}
            </p>
            {signedIn && (
              <p className=&rdquo;mt-2 text-body-sm font-medium text-emerald-700 dark:text-emerald-300&rdquo;>
                Esate prijungti kaip tiekėjas su {email}. Nukreipiame...
              </p>
            )}
            {isPending && !signedIn && (
              <p className=&rdquo;mt-2 text-body-sm text-surface-500 dark:text-surface-400&rdquo;>
                Jokio papildomo &ldquo;tapti tiekėju&rdquo; žingsnio nereikia — jūsų paskyra jau tiekėjo tipo.
              </p>
            )}
          </div>
        </div>
        {!signedIn && (
          <div className=&rdquo;mt-5 flex flex-col gap-3 sm:flex-row&rdquo;>
            <Link
              href={loginHref}
              className=&rdquo;inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700&rdquo;
            >
              <LogIn className=&rdquo;h-4 w-4&rdquo; />
              Prisijungti į tiekėjo panelę
            </Link>
            <Link
              href=&rdquo;/slaptazodis&rdquo;
              className=&rdquo;inline-flex min-h-11 items-center justify-center rounded-lg border border-surface-200 px-4 text-body-sm font-semibold text-surface-700 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800&rdquo;
            >
              Pamiršau slaptažodį
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className=&rdquo;mt-8 rounded-lg border border-brand-100 bg-white p-5 text-left shadow-sm dark:border-brand-500/20 dark:bg-surface-900&rdquo;>
      <div className=&rdquo;flex gap-3&rdquo;>
        <div className=&rdquo;flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300&rdquo;>
          <KeyRound className=&rdquo;h-5 w-5&rdquo; />
        </div>
        <div>
          <h2 className=&rdquo;text-body font-semibold text-surface-900 dark:text-white&rdquo;>
            Sukurkite tiekėjo paskyrą
          </h2>
          <p className=&rdquo;mt-1 text-body-sm leading-relaxed text-surface-600 dark:text-surface-300&rdquo;>
            El. paštas {email} patvirtintas. Susikurkite slaptažodį — paskyra bus iš karto tiekėjo tipo. Po administratoriaus patvirtinimo galėsite valdyti &ldquo;{supplierName}&rdquo; profilį.
          </p>
        </div>
      </div>

      <form onSubmit={handleCreateAccount} className=&rdquo;mt-5 space-y-4&rdquo;>
        <Input
          id=&rdquo;claim-name&rdquo;
          label=&rdquo;Jūsų vardas&rdquo;
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder=&rdquo;Vardas Pavardė&rdquo;
          required
        />
        <Input
          id=&rdquo;claim-password&rdquo;
          label=&rdquo;Slaptažodis&rdquo;
          type=&rdquo;password&rdquo;
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder=&rdquo;Bent 8 simboliai&rdquo;
          required
        />
        <Input
          id=&rdquo;claim-confirm-password&rdquo;
          label=&rdquo;Pakartokite slaptažodį&rdquo;
          type=&rdquo;password&rdquo;
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder=&rdquo;Pakartokite slaptažodį&rdquo;
          required
        />

        {error && (
          <p className=&rdquo;rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-body-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300&rdquo;>
            {error}
          </p>
        )}

        <Button type=&rdquo;submit&rdquo; isLoading={loading} className=&rdquo;min-h-11 w-full rounded-lg&rdquo;>
          Sukurti tiekėjo paskyrą
        </Button>

        <p className=&rdquo;text-micro text-surface-400 text-center&rdquo;>
          Papildomo &ldquo;tapti tiekėju&rdquo; žingsnio nereikės
        </p>
      </form>
    </div>
  );
}
