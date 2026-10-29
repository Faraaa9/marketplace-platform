import AccountShell from "@/components/account/AccountShell";

// Auth + role gating for /tiekejas/* is handled by src/proxy.ts (matcher:
// "/tiekejas/:path*"). The shell has no server-side data access, which keeps
// the layout prerender-safe under Cache Components.
export default function TiekejasLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell kind="provider">{children}</AccountShell>;
}
