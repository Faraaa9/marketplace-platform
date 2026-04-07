import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-display-xl font-bold bg-gradient-to-r from-brand-600 to-brand-400 bg-clip-text text-transparent">404</h1>
      <h2 className="mt-4 text-heading-2 font-semibold text-surface-900 dark:text-white">Puslapis nerastas</h2>
      <p className="mt-2 text-body text-surface-500 dark:text-surface-400">Atsiprašome, bet šis puslapis neegzistuoja.</p>
      <Link
        href="/"
        className="mt-8 inline-flex rounded-xl bg-brand-600 px-6 py-3 text-body-sm font-medium text-white hover:bg-brand-700 shadow-sm transition-all duration-150 hover:shadow-md"
      >
        Grįžti į pradžią
      </Link>
    </div>
  );
}
