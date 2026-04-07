"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 dark:bg-red-500/10">
        <span className="text-display font-bold text-red-500">!</span>
      </div>
      <h2 className="mt-2 text-heading-2 font-semibold text-surface-900 dark:text-white">Kažkas nepavyko</h2>
      <p className="mt-2 text-body text-surface-500 dark:text-surface-400">Atsiprašome, įvyko netikėta klaida.</p>
      <button
        onClick={reset}
        className="mt-8 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-body-sm font-medium text-white hover:bg-brand-700 shadow-sm transition-all duration-150 hover:shadow-md"
      >
        Bandyti dar kartą
      </button>
    </div>
  );
}
