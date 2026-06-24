import { Suspense } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import NewRequestClient from "./NewRequestClient";

function NewRequestShell() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">
        Tavo skelbimas
      </h1>
      <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
        Aprašyk, ko reikia — tiekėjai patys pateiks pasiūlymus.
      </p>
      <div className="mt-8">
        <LoadingSpinner />
      </div>
    </div>
  );
}

export default function NewRequestV2Page() {
  return (
    <Suspense fallback={<NewRequestShell />}>
      <NewRequestClient />
    </Suspense>
  );
}
