import type { Metadata } from "next";
import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import BecomeProviderClient from "./BecomeProviderClient";

// Auth-gated action page: anonymous visitors (and crawlers) are 307-redirected
// to /registruotis, so the crawler only ever sees an empty redirect body (no
// H1, root fallback title). It is not a content page — keep it out of the index.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function BecomeProviderPage() {
  return (
    <Suspense fallback={null}>
      <SessionGate />
    </Suspense>
  );
}

async function SessionGate() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/registruotis");
  }

  if (session.user.role === "PROVIDER") {
    redirect("/tiekejas");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return <BecomeProviderClient />;
}
