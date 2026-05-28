// Render this INSIDE a <Suspense> — it is async and reads the session (dynamic
// under cacheComponents). Never place it in a layout.
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

type SessionGateProps = {
  requireRole?: "PROVIDER" | "ADMIN" | "USER";
  /** Post-login return path passed to /prisijungti. Defaults to "/". */
  callbackUrl?: string;
  children: (userId: string) => ReactNode;
};

export async function SessionGate({
  requireRole,
  callbackUrl = "/",
  children,
}: SessionGateProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/prisijungti?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  // Role mismatch redirects mirror the edge proxy (src/proxy.ts): an admin
  // landing on a non-admin gate goes to /admin, a logged-in non-provider asked
  // for PROVIDER is sent to onboarding, everything else falls back home.
  if (requireRole && session.user.role !== requireRole) {
    if (session.user.role === "ADMIN") redirect("/admin");
    if (requireRole === "PROVIDER") redirect("/tapti-tiekeju");
    redirect("/");
  }

  return children(session.user.id);
}
