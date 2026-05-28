// Auth + role gating for /tiekejas/* is handled by src/proxy.ts (matcher:
// "/tiekejas/:path*"). Layout intentionally has no server-side data access —
// keeps it prerender-safe under Cache Components.
export default function TiekejasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
