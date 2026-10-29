import { Suspense, type ReactNode } from "react";
import AccountSidebar, { type AccountKind } from "./AccountSidebar";

// Layout-safe (no session read): the sidebar resolves the session client-side,
// so the shell prerenders under Cache Components.
export default function AccountShell({ kind, children }: { kind: AccountKind; children: ReactNode }) {
  return (
    <div className="min-h-[calc(100dvh-72px)] bg-surface-50 text-body-sm text-surface-900 dark:bg-surface-950 dark:text-surface-100 md:flex">
      <Suspense fallback={<div className="hidden w-[232px] shrink-0 md:block" />}>
        <AccountSidebar kind={kind} />
      </Suspense>
      <div className="mx-auto w-full min-w-0 max-w-[1180px] px-4 pb-12 pt-5 sm:px-6 md:px-9 md:pt-7">{children}</div>
    </div>
  );
}
