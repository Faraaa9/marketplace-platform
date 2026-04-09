"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SERVICE_CATEGORIES, BUDGET_OPTIONS, LITHUANIAN_CITIES } from "@/lib/constants";
import { saveGuestRequest } from "@/lib/guest-request";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import RecentRequestBanner from "@/components/guest/RecentRequestBanner";

export default function NewRequestPage() {
  return <Suspense fallback={<LoadingSpinner />}><NewRequestForm /></Suspense>;
}

function NewRequestForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user;
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    category: searchParams.get("category") || "",
    title: "",
    description: "",
    location: "",
    budget: "",
    clientName: session?.user?.name || "",
    clientEmail: session?.user?.email || "",
    clientPhone: "",
    createAccount: false,
    password: "",
  });

  function updateForm(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const trimmedDescriptionLength = form.description.trim().length;
  const descriptionMinLength = 20;
  const descriptionError =
    form.description.length > 0 && trimmedDescriptionLength < descriptionMinLength
      ? `Aprašymas turi būti bent ${descriptionMinLength} simbolių`
      : "";

  function canProceed(): boolean {
    if (step === 1) return !!(form.category && form.title.trim().length >= 5 && trimmedDescriptionLength >= descriptionMinLength && form.location);
    if (step === 2) {
      const baseValid = form.clientName.length >= 2 && form.clientEmail.includes("@");
      if (form.createAccount) return baseValid && form.password.length >= 6;
      return baseValid;
    }
    return true;
  }

  async function handleSubmit() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        if (!isLoggedIn) {
          saveGuestRequest(data.data.trackingToken, form.title);
        }
        const params = new URLSearchParams();
        if (data.data?.emailSent === false) {
          params.set("delivery", "failed");
        } else if (data.data?.emailMock) {
          params.set("delivery", "mock");
        }
        router.push(`/uzklausos/sekti/${data.data.trackingToken}${params.toString() ? `?${params.toString()}` : ""}`);
      } else {
        setError(data.error || "Klaida pateikiant užklausą");
        // Stay on step 2 for account-related errors so user can uncheck or fix
        setStep(res.status === 409 ? 2 : 1);
      }
    } catch {
      setError("Klaida pateikiant užklausą");
    } finally {
      setLoading(false);
    }
  }

  const categoryLabel = SERVICE_CATEGORIES.find((c) => c.value === form.category)?.label;
  const budgetLabel = BUDGET_OPTIONS.find((b) => b.value === form.budget)?.label;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white mb-2">Nauja užklausa</h1>
      <p className="text-body-sm text-surface-500 dark:text-surface-400 mb-6">Aprašykite ko jums reikia ir gaukite pasiūlymus</p>

      {/* Show recovery banner only for guests */}
      {!isLoggedIn && (
        <div className="mb-6">
          <RecentRequestBanner />
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-10 flex items-center gap-3">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full transition-colors ${s <= step ? "bg-brand-600" : "bg-surface-200 dark:bg-surface-700"}`} />
            <p className={`mt-2 text-micro font-medium ${s <= step ? "text-brand-600" : "text-surface-400"}`}>
              {s === 1 ? "Užduotis" : s === 2 ? "Kontaktai" : "Peržiūra"}
            </p>
          </div>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 p-3 text-body-sm text-red-600 dark:bg-red-500/10 dark:text-red-400">{error}</div>
      )}

      {/* Step 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <Select
            id="category"
            label="Kategorija"
            options={SERVICE_CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
            placeholder="Pasirinkite kategoriją"
            value={form.category}
            onChange={(e) => updateForm("category", e.target.value)}
          />
          <Input
            id="title"
            label="Pavadinimas"
            placeholder="Pvz.: Reikia sutaisyti vandens čiaupą"
            value={form.title}
            onChange={(e) => updateForm("title", e.target.value)}
          />
          <Textarea
            id="description"
            label="Aprašymas"
            placeholder="Aprašykite detaliau — ką reikia padaryti, kokie darbų mastai, ar turite medžiagas..."
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
            error={descriptionError || undefined}
          />
          <div className="flex items-center justify-between text-micro">
            <span className={descriptionError ? "text-red-500 dark:text-red-400" : "text-surface-400"}>
              Bent {descriptionMinLength} simbolių, kad tiekėjai suprastų užduotį
            </span>
            <span className={trimmedDescriptionLength >= descriptionMinLength ? "text-emerald-600 dark:text-emerald-400" : "text-surface-400"}>
              {trimmedDescriptionLength}/{descriptionMinLength}
            </span>
          </div>
          <Select
            id="location"
            label="Miestas"
            options={LITHUANIAN_CITIES.map((c) => ({ value: c, label: c }))}
            placeholder="Pasirinkite miestą"
            value={form.location}
            onChange={(e) => updateForm("location", e.target.value)}
          />
          <Select
            id="budget"
            label="Biudžetas (neprivaloma)"
            options={BUDGET_OPTIONS.map((b) => ({ value: b.value, label: b.label }))}
            placeholder="Pasirinkite biudžetą"
            value={form.budget}
            onChange={(e) => updateForm("budget", e.target.value)}
          />
          <div className="flex justify-end pt-2">
            <Button onClick={() => setStep(2)} disabled={!canProceed()}>Toliau</Button>
          </div>
        </div>
      )}

      {/* Step 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <Input
            id="clientName"
            label="Jūsų vardas"
            placeholder="Jonas"
            value={form.clientName}
            onChange={(e) => updateForm("clientName", e.target.value)}
          />
          <Input
            id="clientEmail"
            label="El. paštas"
            type="email"
            placeholder="jusu@pastas.lt"
            value={form.clientEmail}
            onChange={(e) => updateForm("clientEmail", e.target.value)}
          />
          <Input
            id="clientPhone"
            label="Telefonas (neprivaloma)"
            type="tel"
            placeholder="+370..."
            value={form.clientPhone}
            onChange={(e) => updateForm("clientPhone", e.target.value)}
          />
          {!isLoggedIn && (
            <>
              <div className="rounded-xl border border-surface-200/60 bg-surface-50/50 p-4 dark:border-surface-700/50 dark:bg-surface-800/30">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="createAccount"
                    checked={form.createAccount}
                    onChange={(e) => updateForm("createAccount", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded-md border-surface-300 text-brand-600 focus:ring-brand-500 dark:border-surface-600"
                  />
                  <div>
                    <label htmlFor="createAccount" className="text-body-sm font-medium text-surface-700 dark:text-surface-300 cursor-pointer">
                      Sukurti nemokamą paskyrą
                    </label>
                    <p className="text-micro text-surface-400 mt-0.5">
                      Matysite visas užklausas vienoje vietoje ir nereikės ieškoti sekimo nuorodos
                    </p>
                  </div>
                </div>
              </div>
              {form.createAccount && (
                <Input
                  id="password"
                  label="Slaptažodis"
                  type="password"
                  placeholder="Bent 6 simboliai"
                  value={form.password}
                  onChange={(e) => updateForm("password", e.target.value)}
                />
              )}
            </>
          )}
          <div className="flex justify-between pt-2">
            <Button variant="outline" onClick={() => setStep(1)}>Atgal</Button>
            <Button onClick={() => setStep(3)} disabled={!canProceed()}>Toliau</Button>
          </div>
        </div>
      )}

      {/* Step 3 - Review */}
      {step === 3 && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-surface-200/60 bg-white p-6 shadow-card dark:border-surface-700/50 dark:bg-surface-900/50">
            <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white mb-5">Jūsų užklausa</h3>
            <dl className="space-y-3 text-body-sm">
              <div className="flex justify-between">
                <dt className="text-surface-500">Kategorija:</dt>
                <dd className="font-medium text-surface-900 dark:text-white">{categoryLabel}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-surface-500">Pavadinimas:</dt>
                <dd className="font-medium text-surface-900 dark:text-white">{form.title}</dd>
              </div>
              <div>
                <dt className="text-surface-500 mb-1">Aprašymas:</dt>
                <dd className="text-surface-900 dark:text-white">{form.description}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-surface-500">Miestas:</dt>
                <dd className="font-medium text-surface-900 dark:text-white">{form.location}</dd>
              </div>
              {form.budget && (
                <div className="flex justify-between">
                  <dt className="text-surface-500">Biudžetas:</dt>
                  <dd className="font-medium text-surface-900 dark:text-white">{budgetLabel}</dd>
                </div>
              )}
              <hr className="border-surface-200/50 dark:border-surface-700" />
              <div className="flex justify-between">
                <dt className="text-surface-500">Vardas:</dt>
                <dd className="font-medium text-surface-900 dark:text-white">{form.clientName}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-surface-500">El. paštas:</dt>
                <dd className="font-medium text-surface-900 dark:text-white">{form.clientEmail}</dd>
              </div>
              {form.clientPhone && (
                <div className="flex justify-between">
                  <dt className="text-surface-500">Telefonas:</dt>
                  <dd className="font-medium text-surface-900 dark:text-white">{form.clientPhone}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-500/10">
            <p className="text-body-sm font-medium text-amber-900 dark:text-amber-200">
              Ką reikės padaryti po pateikimo:
            </p>
            <ul className="mt-2 space-y-1 text-body-sm text-amber-800 dark:text-amber-300">
              <li>• Patvirtinti el. paštą — tik tada tiekėjai matys jūsų užklausą</li>
              {isLoggedIn ? (
                <li>• Užklausą rasite skiltyje &bdquo;Mano užklausos&ldquo;</li>
              ) : (
                <li>• Neuždarykite sekimo puslapio arba išsaugokite nuorodą — ji leidžia grįžti prie užklausos</li>
              )}
            </ul>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(2)}>Atgal</Button>
            <Button onClick={handleSubmit} isLoading={loading}>Pateikti užklausą</Button>
          </div>
        </div>
      )}
    </div>
  );
}
