import { Suspense } from "react";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { isCategorizationV2Enabled } from "@/lib/platform-settings";
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

export default async function NewRequestV2Page() {
  // v2-only flow disables the legacy ai-improve (description rewrite + Taip/Ne
  // questions); cached + isolated, defaults false until the flag column exists.
  const categorizationV2Enabled = await isCategorizationV2Enabled();
  return (
    <Suspense fallback={<NewRequestShell />}>
      <NewRequestClient categorizationV2Enabled={categorizationV2Enabled} />
    </Suspense>
  );
}
