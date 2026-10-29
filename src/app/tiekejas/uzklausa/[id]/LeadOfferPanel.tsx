"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import GenerateProposalButton from "@/components/ai/GenerateProposalButton";
import { refreshAccountSummary } from "@/components/account/AccountSidebar";
import { BUTTON_PRIMARY, Panel } from "@/components/account/ui";
import { ltCount } from "@/lib/utils";

const FIELD =
  "w-full rounded-lg border border-surface-200 bg-white px-3 text-body-sm text-surface-900 placeholder:text-surface-400 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600 dark:border-surface-700 dark:bg-surface-900 dark:text-white";

/**
 * Unlock CTA, then the offer composer. Unlocking reuses the idempotent
 * /unlock endpoint; sending reuses the existing response endpoint. After
 * either, router.refresh() re-renders the server page (contacts, sent banner).
 */
export default function LeadOfferPanel({
  requestId,
  unlocked,
  credits,
}: {
  requestId: string;
  unlocked: boolean;
  credits: number;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [price, setPrice] = useState("");
  const [start, setStart] = useState("");

  async function unlock() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${requestId}/unlock`, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Nepavyko atrakinti užklausos");
      router.refresh();
      refreshAccountSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko atrakinti užklausos");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (busy || message.trim().length < 10) return;
    setBusy(true);
    setError("");
    // ponytail: no start-date column on Response — it travels as the last line
    // of the message; add a field if customers need to sort by it.
    const fullMessage = start.trim() ? `${message.trim()}\n\nGaliu pradėti: ${start.trim()}` : message.trim();
    const priceValue = price.trim() ? Number(price.replace(/\s/g, "").replace(",", ".")) : undefined;
    if (priceValue !== undefined && !(priceValue > 0)) {
      setError("Kaina turi būti teigiamas skaičius");
      setBusy(false);
      return;
    }
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${requestId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: fullMessage, price: priceValue }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.error || "Nepavyko išsiųsti pasiūlymo");
      router.refresh();
      refreshAccountSummary();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepavyko išsiųsti pasiūlymo");
      setBusy(false);
    }
  }

  if (!unlocked) {
    const canAfford = credits >= 1;
    return (
      <div className="flex flex-wrap items-center gap-3.5 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 p-4 dark:border-brand-800/50 dark:bg-brand-950/30">
        <div className="min-w-0 flex-[1_1_260px]">
          <p className="font-semibold">Norite pateikti pasiūlymą?</p>
          <p className="mt-1 text-caption font-normal text-surface-600 dark:text-surface-300">
            Atrakinus matysite kliento kontaktus ir galėsite parašyti pasiūlymą. Kaina — 1 kreditas (turite{" "}
            {ltCount(credits, ["kreditą", "kreditus", "kreditų"])}).
          </p>
          {error && <p className="mt-1 text-caption text-red-700">{error}</p>}
        </div>
        {canAfford ? (
          <button type="button" onClick={unlock} disabled={busy} className={BUTTON_PRIMARY}>
            {busy ? "Atrakinama…" : "Atrakinti už 1 kreditą"}
          </button>
        ) : (
          <Link href="/tiekejas/planai" className={BUTTON_PRIMARY}>
            Papildyti kreditus
          </Link>
        )}
      </div>
    );
  }

  return (
    <Panel className="flex flex-col gap-3.5">
      <h2 className="text-[15px] font-semibold">Jūsų pasiūlymas</h2>
      <GenerateProposalButton requestId={requestId} value={message} onChange={setMessage} targetId="offer-message" />
      <label className="flex flex-col gap-1.5">
        <span className="text-caption font-semibold">Žinutė klientui</span>
        <textarea
          id="offer-message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={1900}
          placeholder="Prisistatykite, kaip atliktumėte darbą, kada galite pradėti…"
          className={`${FIELD} resize-y py-3 leading-relaxed`}
        />
      </label>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-[0_1_200px] flex-col gap-1.5">
          <span className="text-caption font-semibold">Orientacinė kaina, €</span>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="pvz. 250"
            className={`${FIELD} h-11`}
          />
        </label>
        <label className="flex flex-[0_1_220px] flex-col gap-1.5">
          <span className="text-caption font-semibold">Galiu pradėti</span>
          <input
            value={start}
            onChange={(e) => setStart(e.target.value)}
            maxLength={80}
            placeholder="pvz. nuo lapkričio 10 d."
            className={`${FIELD} h-11`}
          />
        </label>
        <button
          type="button"
          onClick={send}
          disabled={busy || message.trim().length < 10}
          className={`${BUTTON_PRIMARY} sm:ml-auto`}
        >
          {busy ? "Siunčiama…" : "Siųsti pasiūlymą"}
        </button>
      </div>
      {error && <p className="text-caption text-red-700 dark:text-red-400">{error}</p>}
    </Panel>
  );
}
