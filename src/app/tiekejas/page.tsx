import { Suspense } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { SessionGate } from "@/components/auth/SessionGate";
import { prisma } from "@/lib/prisma";
import { ProviderWorkCenter } from "./sections/ProviderWorkCenter";

export default function ProviderDashboardPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-7 sm:px-6 sm:py-10">
      <Suspense fallback={null}>
        <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas">
          {(userId) => <DashboardBody userId={userId} />}
        </SessionGate>
      </Suspense>
    </div>
  );
}

async function DashboardBody({ userId }: { userId: string }) {
  // The proxy + gate guarantee role=PROVIDER, but a provider-role user can still
  // lack a profile (mid-onboarding). Without this the sections would render
  // misleading "suspended" state off a null profile.
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: { id: true, slug: true },
  });

  if (!profile) return <NoProviderProfile />;

  return <ProviderWorkCenter userId={userId} slug={profile.slug} />;
}

function NoProviderProfile() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
        <Sparkles className="h-8 w-8 text-brand-600" />
      </div>
      <h2 className="mb-3 text-heading-2 font-bold text-surface-900 dark:text-white">
        Tu neturi paslaugų teikėjo profilio
      </h2>
      <p className="mb-6 text-body text-surface-500 dark:text-surface-400">
        Sukurk profilį per kelias sekundes — užteks įklijuoti savo paslaugos.lt ar
        LinkedIn nuorodą.
      </p>
      <div className="flex justify-center gap-3">
        <Link
          href="/meistrai/kurti-profili"
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-body-sm font-medium text-white transition-colors hover:bg-brand-700"
        >
          <Sparkles className="h-4 w-4" />
          Sukurti profilį su AI
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-surface-200 px-4 py-2.5 text-body-sm font-medium text-surface-700 transition-colors hover:bg-surface-50 dark:border-surface-700 dark:text-surface-200 dark:hover:bg-surface-800"
        >
          Į pradžią
        </Link>
      </div>
    </div>
  );
}
