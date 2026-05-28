import { Suspense } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import BecomeProviderClient from "./BecomeProviderClient";

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
