"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Loader2, CheckCircle, AlertCircle } from "lucide-react";

interface SupplierData {
  id: string;
  displayName: string;
  slug: string;
  status: string;
  shortSummary: string | null;
  description: string | null;
  phonePublic: string | null;
  emailPublic: string | null;
  websiteUrl: string | null;
  city: string | null;
  externalSource: string | null;
  externalSourceUrl: string | null;
  categories: Array<{ name: string; slug: string; isPrimary: boolean }>;
}

interface FormState {
  displayName: string;
  shortSummary: string;
  description: string;
  phonePublic: string;
  emailPublic: string;
  websiteUrl: string;
  city: string;
}

export default function SupplierEditPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const params = useParams();
  const slug = params.slug as string;

  const [supplier, setSupplier] = useState<SupplierData | null>(null);
  const [form, setForm] = useState<FormState>({
    displayName: "",
    shortSummary: "",
    description: "",
    phonePublic: "",
    emailPublic: "",
    websiteUrl: "",
    city: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/prisijungti");
      return;
    }
    if (sessionStatus !== "authenticated") return;

    fetch(`/api/suppliers/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.success) {
          setError("Tiekejas nerastas");
          return;
        }
        const s = data.data as SupplierData;
        setSupplier(s);
        setForm({
          displayName: s.displayName || "",
          shortSummary: s.shortSummary || "",
          description: s.description || "",
          phonePublic: s.phonePublic || "",
          emailPublic: s.emailPublic || "",
          websiteUrl: s.websiteUrl || "",
          city: s.city || "",
        });
      })
      .catch(() => setError("Nepavyko uzkrauti duomenu"))
      .finally(() => setLoading(false));
  }, [slug, sessionStatus, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch(`/api/suppliers/${slug}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!data.success) {
        if (res.status === 403) {
          setForbidden(true);
          setError("Neturite teises redaguoti sio profilio");
        } else if (data.details) {
          const fieldErrors = Object.values(data.details).flat().join(", ");
          setError(fieldErrors || data.error);
        } else {
          setError(data.error || "Issaugoti nepavyko");
        }
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("Tinklo klaida — bandykite dar karta");
    } finally {
      setSaving(false);
    }
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSuccess(false);
  }

  if (loading || sessionStatus === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-surface-400" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-red-400 mb-3" />
        <p className="text-body font-medium text-surface-700 dark:text-surface-300">
          Neturite teises redaguoti sio profilio
        </p>
        <Link href="/tiekejas/katalogas" className="mt-3 inline-block text-body-sm text-brand-600 hover:text-brand-700">
          Grizti i mano profilius
        </Link>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center">
        <p className="text-body text-surface-500">{error || "Tiekejas nerastas"}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link
        href="/tiekejas/katalogas"
        className="mb-6 inline-flex items-center gap-1.5 text-body-sm text-surface-500 transition-colors hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200"
      >
        <ArrowLeft className="h-4 w-4" />
        Mano profiliai
      </Link>

      <div className="mb-6">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
          Redaguoti profili
        </h1>
        <p className="mt-0.5 text-body-sm text-surface-500 dark:text-surface-400">
          {supplier.displayName} — {supplier.status}
        </p>
      </div>

      {/* Read-only info */}
      <div className="mb-6 rounded-2xl border border-surface-200/60 bg-surface-50 p-4 dark:border-surface-700/50 dark:bg-surface-800/50">
        <p className="text-micro font-medium text-surface-500 uppercase tracking-wider mb-2">Saltinio informacija (tik skaityti)</p>
        <div className="space-y-1 text-body-sm text-surface-600 dark:text-surface-400">
          {supplier.externalSource && <p>Saltinis: {supplier.externalSource}</p>}
          {supplier.externalSourceUrl && (
            <p>
              URL:{" "}
              <a href={supplier.externalSourceUrl} target="_blank" rel="noopener noreferrer" className="text-brand-600 hover:text-brand-700">
                {supplier.externalSourceUrl}
              </a>
            </p>
          )}
          {supplier.categories.length > 0 && (
            <p>
              Kategorijos: {supplier.categories.map((c) => c.name).join(", ")}
            </p>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <FormField label="Pavadinimas" required>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => handleChange("displayName", e.target.value)}
            className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-white"
            required
            minLength={2}
            maxLength={200}
          />
        </FormField>

        <FormField label="Trumpas aprasymas">
          <input
            type="text"
            value={form.shortSummary}
            onChange={(e) => handleChange("shortSummary", e.target.value)}
            className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-white"
            maxLength={500}
            placeholder="Trumpas vienos eilutes aprasymas"
          />
        </FormField>

        <FormField label="Aprasymas">
          <textarea
            value={form.description}
            onChange={(e) => handleChange("description", e.target.value)}
            rows={5}
            className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-white resize-y"
            maxLength={5000}
            placeholder="Detalesnis imones aprasymas, teikiamos paslaugos, patirtis..."
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Telefonas">
            <input
              type="tel"
              value={form.phonePublic}
              onChange={(e) => handleChange("phonePublic", e.target.value)}
              className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-white"
              maxLength={30}
              placeholder="+370..."
            />
          </FormField>

          <FormField label="El. pastas">
            <input
              type="email"
              value={form.emailPublic}
              onChange={(e) => handleChange("emailPublic", e.target.value)}
              className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-white"
              placeholder="info@imone.lt"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Svetaine">
            <input
              type="url"
              value={form.websiteUrl}
              onChange={(e) => handleChange("websiteUrl", e.target.value)}
              className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-white"
              placeholder="https://www.imone.lt"
            />
          </FormField>

          <FormField label="Miestas">
            <input
              type="text"
              value={form.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className="w-full rounded-xl border border-surface-300 bg-white px-3.5 py-2.5 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none dark:border-surface-600 dark:bg-surface-800 dark:text-white"
              maxLength={100}
              placeholder="Vilnius"
            />
          </FormField>
        </div>

        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-body-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-body-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Pakeitimai issaugoti
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {saving ? "Saugoma..." : "Issaugoti"}
          </button>
          <Link
            href="/tiekejas/katalogas"
            className="text-body-sm text-surface-500 hover:text-surface-700 dark:text-surface-400 dark:hover:text-surface-200 transition-colors"
          >
            Atsaukti
          </Link>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-body-sm font-medium text-surface-700 dark:text-surface-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}
