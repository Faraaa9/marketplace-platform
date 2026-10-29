import AccountShell from "@/components/account/AccountShell";

// Auth for /paskyra/* is enforced by src/proxy.ts; pages gate on the session
// inside their own Suspense boundaries.
export default function PaskyraLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell kind="customer">{children}</AccountShell>;
}
