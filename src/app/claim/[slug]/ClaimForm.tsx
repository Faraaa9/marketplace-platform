"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";

interface ClaimFormProps {
  supplierSlug: string;
  supplierName: string;
}

type VerificationMethod = "email" | "manual";

export default function ClaimForm({ supplierSlug, supplierName }: ClaimFormProps) {
  const [email, setEmail] = useState("");
  const [method, setMethod] = useState<VerificationMethod>("email");
  const [evidence, setEvidence] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierSlug,
          requestedByEmail: email,
          verificationMethod: method,
          ...(method === "manual" && evidence ? { submittedEvidenceJson: evidence } : {}),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Klaida pateikiant prašymą. Bandykite dar kartą.");
        return;
      }

      setSuccess(
        data.message ||
          (method === "email"
            ? "Prašymas sukurtas. Patikrinkite savo el. paštą."
            : "Prašymas sukurtas. Administratorius netrukus peržiūrės.")
      );
    } catch {
      setError("Tinklo klaida. Patikrinkite interneto ryšį ir bandykite dar kartą.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950/30">
        <h2 className="text-lg font-semibold text-emerald-800 dark:text-emerald-200">
          Prašymas pateiktas
        </h2>
        <p className="mt-2 text-body-sm text-emerald-700 dark:text-emerald-300">
          {success}
        </p>
        {method === "email" && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-white/70 p-3 text-body-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200">
            Patvirtinimo nuoroda dar nesukuria prisijungimo paskyros. Paspaudę nuorodą galėsite susikurti slaptažodį ir tada laukti administratoriaus peržiūros.
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        id="email"
        label="Jūsų el. pašto adresas"
        type="email"
        required
        placeholder="vardas@imone.lt"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      <fieldset>
        <legend className="block text-body-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
          Patvirtinimo būdas
        </legend>
        <div className="space-y-2">
          <label className="flex items-start gap-3 rounded-xl border border-surface-200 p-3 cursor-pointer transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:has-[:checked]:border-brand-400 dark:has-[:checked]:bg-brand-950/20">
            <input
              type="radio"
              name="method"
              value="email"
              checked={method === "email"}
              onChange={() => setMethod("email")}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <div>
              <span className="text-body-sm font-medium text-surface-900 dark:text-white">
                El. pašto patvirtinimas
              </span>
              <p className="text-micro text-surface-500 dark:text-surface-400">
                Išsiųsime patvirtinimo nuorodą į jūsų el. paštą.
              </p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-surface-200 p-3 cursor-pointer transition-colors hover:bg-surface-50 dark:border-surface-700 dark:hover:bg-surface-800/50 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50 dark:has-[:checked]:border-brand-400 dark:has-[:checked]:bg-brand-950/20">
            <input
              type="radio"
              name="method"
              value="manual"
              checked={method === "manual"}
              onChange={() => setMethod("manual")}
              className="mt-0.5 h-4 w-4 accent-brand-600"
            />
            <div>
              <span className="text-body-sm font-medium text-surface-900 dark:text-white">
                Rankinis patvirtinimas
              </span>
              <p className="text-micro text-surface-500 dark:text-surface-400">
                Administratorius peržiūrės jūsų prašymą rankiniu būdu.
              </p>
            </div>
          </label>
        </div>
      </fieldset>

      {method === "manual" && (
        <Textarea
          id="evidence"
          label="Papildoma informacija (neprivaloma)"
          placeholder="Pateikite įrodymus, kad esate šios įmonės atstovas..."
          value={evidence}
          onChange={(e) => setEvidence(e.target.value)}
          rows={4}
        />
      )}

      {error && (
        <div className="rounded-xl bg-red-50 p-3 text-body-sm text-red-700 dark:bg-red-950/30 dark:text-red-300">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" isLoading={submitting} className="w-full">
        {submitting ? "Siunčiama..." : "Pateikti prašymą"}
      </Button>

      <p className="text-micro text-surface-400 dark:text-surface-500 text-center">
        Pateikdami prašymą patvirtinate, kad esate šios įmonės atstovas
        arba turite teisę valdyti šį profilį.
      </p>
    </form>
  );
}
