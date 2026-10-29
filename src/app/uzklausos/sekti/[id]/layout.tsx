import AccountShell from "@/components/account/AccountShell";

// The tracker is reachable by tracking token without an account; the sidebar
// only renders for a signed-in viewer.
export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return <AccountShell kind="customer">{children}</AccountShell>;
}
