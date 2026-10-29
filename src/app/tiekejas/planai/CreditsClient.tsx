"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BUTTON_GHOST, BUTTON_PRIMARY, Notice, PageHeader, Panel, PanelTitle } from "@/components/account/ui";
import { CATEGORY_PERIOD_DAYS, CREDITS_PER_CATEGORY_MONTH, FREE_CATEGORY_LIMIT } from "@/lib/category-pricing";
import { cn, formatDate, ltCount } from "@/lib/utils";

interface Pack {
  id: string;
  name: string;
  credits: number;
  priceCents: number;
  currency: string;
}

interface LedgerEntry {
  id: string;
  amount: number;
  balanceAfter: number;
  type: string;
  note: string | null;
  requestId: string | null;
  createdAt: string;
}

interface CreditsData {
  balance: number;
  packs: Pack[];
  ledger: LedgerEntry[];
}

const TYPE_LABEL: Record<string, string> = {
  PURCHASE: "Pirkimas",
  UNLOCK_SPEND: "Užklausos atrakinimas",
  ADMIN_GRANT: "Administratoriaus dovana",
  STARTER_GRANT: "Startiniai kreditai",
  CATEGORY_UNLOCK: "Papildoma veiklos sritis",
};

const CREDIT_FORMS: [string, string, string] = ["kreditas", "kreditai", "kreditų"];

function eur(cents: number) {
  return `${(cents / 100).toLocaleString("lt-LT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export default function CreditsClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPackId, setCheckoutPackId] = useState("");
  const [checkoutError, setCheckoutError] = useState("");

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    fetch("/api/tiekejas/kreditai", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
        } else if (d.code === "EMAIL_NOT_VERIFIED" || d.code === "ACCOUNT_NOT_ACTIVE" || d.code === "NOT_PROVIDER") {
          router.push("/tiekejas");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleBuy(packId: string) {
    setCheckoutPackId(packId);
    setCheckoutError("");
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditPackId: packId }),
      });
      const d = await res.json();
      if (d.success && d.data.url) {
        window.location.assign(d.data.url);
        return;
      }
      setCheckoutError(d.error || "Nepavyko pradėti mokėjimo. Bandykite dar kartą.");
    } catch {
      setCheckoutError("Nepavyko pradėti mokėjimo. Bandykite dar kartą.");
    }
    setCheckoutPackId("");
  }

  // The best value pack (lowest price per credit) gets the highlight.
  const bestPackId = data?.packs.length
    ? data.packs.reduce((best, p) => (p.priceCents / p.credits < best.priceCents / best.credits ? p : best)).id
    : null;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Kreditai ir sąskaitos"
        sub="Kreditais atrakinamos užklausos. Prenumeratos nėra — mokate tik už tai, ką naudojate."
      />

      {success && <Notice tone="ok">Kreditai sėkmingai pridėti!</Notice>}
      {canceled && <Notice tone="info">Mokėjimas atšauktas.</Notice>}

      {loading || !data ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-28 animate-pulse rounded-xl bg-white dark:bg-surface-900" />
          <div className="h-28 animate-pulse rounded-xl bg-white dark:bg-surface-900" />
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]">
            <Panel>
              <span className="text-caption font-normal text-surface-500">Likutis</span>
              <p className="text-[34px] font-bold leading-tight">{data.balance}</p>
              <span className="text-caption font-normal text-surface-500">
                ≈ {ltCount(data.balance, ["užklausa", "užklausos", "užklausų"])}
              </span>
            </Panel>
            <Panel>
              <span className="text-caption font-normal text-surface-500">Kaip naudojami</span>
              <p className="mt-2 text-caption font-normal leading-relaxed">
                1 užklausos kontaktai — <strong>1 kreditas</strong>
                <br />
                Papildoma veiklos sritis (virš {FREE_CATEGORY_LIMIT}) —{" "}
                <strong>
                  {ltCount(CREDITS_PER_CATEGORY_MONTH, CREDIT_FORMS)} / {CATEGORY_PERIOD_DAYS} d.
                </strong>
                <br />
                Atrakinta užklausa lieka atrakinta visam laikui.
              </p>
            </Panel>
          </div>

          <section>
            <h2 className="mb-3 text-[15px] font-semibold">Pirkti kreditų</h2>
            {checkoutError && <p className="mb-3 text-caption text-red-700">{checkoutError}</p>}
            {data.packs.length === 0 ? (
              <p className="rounded-xl border border-dashed border-surface-200 px-4 py-6 text-center text-surface-500">
                Šiuo metu paketų nėra. Pabandykite vėliau.
              </p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]">
                {data.packs.map((pack) => {
                  const best = pack.id === bestPackId && data.packs.length > 1;
                  return (
                    <div
                      key={pack.id}
                      className={cn(
                        "flex flex-col gap-2 rounded-xl border bg-white p-[18px] dark:bg-surface-900",
                        best
                          ? "border-brand-600 shadow-[0_0_0_2px_rgb(var(--brand-100))]"
                          : "border-surface-100 dark:border-surface-800",
                      )}
                    >
                      {best && (
                        <span className="self-start rounded-full bg-brand-50 px-2.5 py-0.5 text-micro font-semibold text-brand-800">
                          Geriausia kaina
                        </span>
                      )}
                      <strong>{pack.name || ltCount(pack.credits, CREDIT_FORMS)}</strong>
                      <p className="text-[24px] font-bold leading-tight">{eur(pack.priceCents)}</p>
                      <span className="text-caption font-normal text-surface-500">
                        {ltCount(pack.credits, CREDIT_FORMS)} · {eur(Math.round(pack.priceCents / pack.credits))} už kreditą
                      </span>
                      <button
                        type="button"
                        onClick={() => handleBuy(pack.id)}
                        disabled={checkoutPackId !== ""}
                        className={cn(best ? BUTTON_PRIMARY : BUTTON_GHOST, "mt-1")}
                      >
                        {checkoutPackId === pack.id ? "Nukreipiama…" : "Pirkti"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <Panel className="overflow-x-auto p-0 sm:p-0">
            <div className="px-4 pt-4 sm:px-[18px]">
              <PanelTitle>Istorija</PanelTitle>
            </div>
            {data.ledger.length === 0 ? (
              <p className="px-4 pb-4 text-surface-500 sm:px-[18px]">Operacijų dar nėra.</p>
            ) : (
              <table className="w-full border-collapse text-[13.5px]">
                <thead>
                  <tr className="border-b border-surface-100 text-left text-surface-500 dark:border-surface-800">
                    <th className="px-4 py-2.5 font-medium sm:px-[18px]">Data</th>
                    <th className="px-3 py-2.5 font-medium">Kas</th>
                    <th className="px-4 py-2.5 text-right font-medium sm:px-[18px]">Kreditai</th>
                  </tr>
                </thead>
                <tbody>
                  {data.ledger.map((tx) => (
                    <tr key={tx.id} className="border-b border-surface-50 last:border-0 dark:border-surface-800">
                      <td className="whitespace-nowrap px-4 py-3 sm:px-[18px]">{formatDate(tx.createdAt)}</td>
                      <td className="px-3 py-3">{tx.note || TYPE_LABEL[tx.type] || tx.type}</td>
                      <td
                        className={cn(
                          "px-4 py-3 text-right font-semibold tabular-nums sm:px-[18px]",
                          tx.amount > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-surface-600",
                        )}
                      >
                        {tx.amount > 0 ? "+" : "−"}
                        {Math.abs(tx.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
