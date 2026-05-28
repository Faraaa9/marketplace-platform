"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Coins, Sparkles } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { creditsLabel } from "@/lib/utils";

interface UnlockCardProps {
  requestId: string;
  creditBalance: number;
}

export default function UnlockCard({ requestId, creditBalance }: UnlockCardProps) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [error, setError] = useState("");
  const [balance, setBalance] = useState(creditBalance);

  const canAfford = balance >= 1;

  async function handleUnlock() {
    setUnlocking(true);
    setError("");
    try {
      const res = await fetch(`/api/tiekejas/uzklausos/${requestId}/unlock`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        router.refresh();
        return;
      }
      if (data.code === "INSUFFICIENT_CREDITS") {
        setBalance(typeof data.balance === "number" ? data.balance : 0);
        setError("Nepakanka kreditų šiai užklausai atrakinti.");
      } else {
        setError(data.error || "Nepavyko atrakinti užklausos.");
      }
      setConfirming(false);
    } catch {
      setError("Nepavyko atrakinti užklausos.");
      setConfirming(false);
    } finally {
      setUnlocking(false);
    }
  }

  return (
    <Card className="mb-8 border-brand-200 dark:border-brand-800/60">
      <div className="flex flex-col items-center py-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 dark:bg-brand-500/10">
          <Lock className="h-6 w-6 text-brand-600 dark:text-brand-400" />
        </div>
        <h3 className="mt-3 text-heading-3 font-semibold text-surface-900 dark:text-white">
          Atrakinkite šią užklausą
        </h3>
        <p className="mt-1.5 max-w-sm text-body-sm text-surface-500 dark:text-surface-400">
          Atrakinę matysite kliento telefoną bei el. paštą ir galėsite pateikti
          pasiūlymą. Kaina — 1 kreditas.
        </p>

        <div className="mt-3 inline-flex items-center gap-1.5 text-caption text-surface-400">
          <Coins className="h-3.5 w-3.5 text-brand-500" />
          Jūsų balansas:{" "}
          <strong className="text-surface-600 dark:text-surface-300">
            {balance} {creditsLabel(balance)}
          </strong>
        </div>

        {error && (
          <p className="mt-3 text-body-sm text-red-500 dark:text-red-400">{error}</p>
        )}

        <div className="mt-4 w-full max-w-xs">
          {!canAfford ? (
            <Link
              href="/tiekejas/planai"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              <Sparkles className="h-4 w-4" />
              Pirkti kreditų
            </Link>
          ) : confirming ? (
            <div className="space-y-2">
              <p className="text-caption text-surface-500 dark:text-surface-400">
                Bus nurašytas 1 kreditas. Tęsti?
              </p>
              <div className="flex gap-2">
                <Button onClick={handleUnlock} isLoading={unlocking} className="flex-1">
                  Taip, atrakinti
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setConfirming(false)}
                  disabled={unlocking}
                  className="flex-1"
                >
                  Atšaukti
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => setConfirming(true)} className="w-full">
              <Lock className="mr-2 h-4 w-4" />
              Atrakinti — 1 kreditas
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
