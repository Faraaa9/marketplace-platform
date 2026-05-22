"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import Button from "@/components/ui/Button";
import { creditsLabel, formatDate } from "@/lib/utils";
import { Coins, Check, X } from "lucide-react";

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
};

export default function CreditsPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CreditsContent />
    </Suspense>
  );
}

function CreditsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [data, setData] = useState<CreditsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutPackId, setCheckoutPackId] = useState("");

  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  useEffect(() => {
    fetch("/api/tiekejas/kreditai")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setData(d.data);
        } else if (
          d.code === "EMAIL_NOT_VERIFIED" ||
          d.code === "ACCOUNT_NOT_ACTIVE" ||
          d.code === "NOT_PROVIDER"
        ) {
          router.push("/tiekejas");
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function handleBuy(packId: string) {
    setCheckoutPackId(packId);
    try {
      const res = await fetch("/api/stripe/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ creditPackId: packId }),
      });
      const d = await res.json();
      if (d.success && d.data.url) {
        window.location.href = d.data.url;
      } else {
        setCheckoutPackId("");
      }
    } catch {
      setCheckoutPackId("");
    }
  }

  if (loading) return <LoadingSpinner />;
  if (!data) return null; // redirected away

  const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Kreditai</h1>
        <p className="mt-1 text-body text-surface-500 dark:text-surface-400">
          Vienas kreditas atrakina vieną klientų užklausą — matote kontaktus ir galite atsakyti.
        </p>
      </div>

      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200/60 bg-emerald-50 px-5 py-4 dark:border-emerald-800/40 dark:bg-emerald-500/10">
          <Check className="h-5 w-5 text-emerald-600" />
          <p className="text-body-sm font-medium text-emerald-700 dark:text-emerald-400">
            Kreditai sėkmingai pridėti!
          </p>
        </div>
      )}
      {canceled && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-surface-200 bg-surface-50 px-5 py-4 dark:border-surface-700 dark:bg-surface-800/50">
          <X className="h-5 w-5 text-surface-400" />
          <p className="text-body-sm text-surface-500 dark:text-surface-400">Mokėjimas atšauktas.</p>
        </div>
      )}

      {/* Balance */}
      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-surface-200/60 bg-white p-6 dark:border-surface-700/50 dark:bg-surface-900">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
          <Coins className="h-7 w-7 text-brand-600 dark:text-brand-400" />
        </div>
        <div>
          <p className="text-micro font-medium text-surface-500">Jūsų balansas</p>
          <p className="text-display font-bold text-surface-900 dark:text-white">
            {data.balance}{" "}
            <span className="text-heading-3 font-semibold text-surface-400">
              {creditsLabel(data.balance)}
            </span>
          </p>
        </div>
      </div>

      {/* Packs */}
      <h2 className="mb-3 text-heading-3 font-semibold text-surface-900 dark:text-white">
        Pirkti kreditų
      </h2>
      {data.packs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-surface-200 px-4 py-6 text-center text-body-sm text-surface-400 dark:border-surface-700">
          Šiuo metu paketų nėra. Pabandykite vėliau.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {data.packs.map((pack) => (
            <div
              key={pack.id}
              className="rounded-2xl border border-surface-200/60 bg-white p-6 text-center transition-shadow hover:shadow-stripe dark:border-surface-700/50 dark:bg-surface-900"
            >
              <p className="text-body-sm font-medium text-surface-500">{pack.name}</p>
              <p className="mt-2 text-display font-bold text-surface-900 dark:text-white">
                {pack.credits}
              </p>
              <p className="text-micro text-surface-400">{creditsLabel(pack.credits)}</p>
              <p className="mt-3 text-heading-3 font-semibold text-surface-900 dark:text-white">
                {eur(pack.priceCents)}
              </p>
              <p className="text-micro text-surface-400">
                {eur(Math.round(pack.priceCents / pack.credits))} / kreditas
              </p>
              <Button
                className="mt-4 w-full"
                isLoading={checkoutPackId === pack.id}
                onClick={() => handleBuy(pack.id)}
              >
                Pirkti
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Ledger */}
      {data.ledger.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-heading-3 font-semibold text-surface-900 dark:text-white">
            Istorija
          </h2>
          <div className="divide-y divide-surface-100 rounded-2xl border border-surface-200/60 bg-white dark:divide-surface-800 dark:border-surface-700/50 dark:bg-surface-900">
            {data.ledger.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-body-sm text-surface-900 dark:text-white">
                    {tx.note || TYPE_LABEL[tx.type] || tx.type}
                  </p>
                  <p className="text-micro text-surface-400">{formatDate(tx.createdAt)}</p>
                </div>
                <span
                  className={`shrink-0 text-body-sm font-semibold tabular-nums ${
                    tx.amount > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-surface-500 dark:text-surface-400"
                  }`}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
