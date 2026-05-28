import Link from "next/link";
import { Coins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { creditsLabel } from "@/lib/utils";

/** Provider's current credit balance, linking to the plans/top-up page. */
export async function CreditBadge({ userId }: { userId: string }) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { creditBalance: true },
  });
  const balance = profile?.creditBalance ?? 0;

  return (
    <Link
      href="/tiekejas/planai"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-surface-200 bg-surface-50 px-2.5 text-micro font-semibold text-surface-700 transition-colors hover:border-brand-300 hover:text-brand-700 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-200"
    >
      <Coins className="h-3.5 w-3.5 text-brand-500" />
      {balance} {creditsLabel(balance)}
    </Link>
  );
}
