"use client";

import { useState, type FormEvent } from "react";
import Card from "@/components/ui/Card";
import { creditsLabel } from "@/lib/utils";
import { Gift } from "lucide-react";

const inputCls =
  "rounded-lg border border-surface-200 bg-white px-3 py-2 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-surface-700 dark:bg-surface-900 dark:text-white";

interface GrantResult {
  providerName: string;
  email: string;
  granted: number;
  balance: number;
}

export default function GrantCreditsByEmailCard({
  onGranted,
}: {
  onGranted: () => void;
}) {
  const [email, setEmail] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<GrantResult | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(null);

    const trimmedEmail = email.trim();
    const credits = parseInt(amount, 10);
    if (!trimmedEmail) {
      setError("Įveskite tiekėjo el. paštą");
      return;
    }
    if (!Number.isInteger(credits) || credits <= 0) {
      setError("Kreditų skaičius turi būti teigiamas");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/admin/tiekejai", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grant-credits",
          email: trimmedEmail,
          credits,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Nepavyko išsiųsti kreditų");
        return;
      }
      setSuccess(data.data as GrantResult);
      setEmail("");
      setAmount("");
      setNote("");
      onGranted();
    } catch {
      setError("Nepavyko išsiųsti kreditų");
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-500/10">
          <Gift className="h-5 w-5 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <p className="text-body font-semibold text-surface-900 dark:text-white">
            Siųsti kreditus pagal el. paštą
          </p>
          <p className="text-micro text-surface-500 dark:text-surface-400">
            Įveskite tiekėjo el. paštą ir kreditų kiekį — kreditai pridedami iškart.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Tiekėjo el. paštas</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tiekejas@pavyzdys.lt"
            className={`${inputCls} w-64`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Kreditai</span>
          <input
            type="number"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5"
            className={`${inputCls} w-24`}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro text-surface-400">Žinutė (nebūtina)</span>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Pvz. ačiū, kad esate su mumis"
            className={`${inputCls} w-60`}
          />
        </label>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-body-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
        >
          <Gift className="h-4 w-4" />
          {sending ? "Siunčiama..." : "Siųsti kreditus"}
        </button>
      </form>

      {error && (
        <p className="mt-3 text-micro text-red-500 dark:text-red-400">{error}</p>
      )}
      {success && (
        <p className="mt-3 text-micro text-emerald-600 dark:text-emerald-400">
          Tiekėjui {success.providerName} pridėta {success.granted}{" "}
          {creditsLabel(success.granted)}. Naujas balansas: {success.balance}.
        </p>
      )}
    </Card>
  );
}
