import { Suspense } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import CreditsClient from "./CreditsClient";

function CreditsShell() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">Kreditai</h1>
        <p className="mt-1 text-body text-surface-500 dark:text-surface-400">
          Vienas kreditas atrakina vieną klientų užklausą — matote kontaktus ir galite atsakyti.
        </p>
      </div>
      <div className="mt-8">
        <LoadingSpinner />
      </div>
    </div>
  );
}

export default function CreditsPage() {
  return (
    <Suspense fallback={<CreditsShell />}>
      <CreditsClient />
    </Suspense>
  );
}
