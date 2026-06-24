import { Suspense } from "react";
import LoginClient from "./LoginClient";

function LoginShell() {
  return (
    <div className="relative flex min-h-[85vh] items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-surface-200/60 bg-white/90 p-8 shadow-elevated backdrop-blur-sm dark:border-surface-700/50 dark:bg-surface-900/90">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg shadow-brand-600/20">
              <span className="text-lg font-bold text-white">P</span>
            </div>
            <h1 className="text-heading-2 font-bold text-surface-900 dark:text-white">
              Prisijungimas
            </h1>
            <p className="mt-1 text-body-sm text-surface-500 dark:text-surface-400">
              Sveiki sugrįžę!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginClient />
    </Suspense>
  );
}
