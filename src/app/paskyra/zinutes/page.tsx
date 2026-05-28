import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SentInquiriesView from "./SentInquiriesView";

export const metadata: Metadata = {
  title: "Žinutės | PaslaugųRinka",
  description: "Pokalbiai, kuriuos pradėjote rašydami tiekėjams.",
};


// Cache Components requires the session check (uncached) to live inside a
// Suspense boundary. The page shell prerenders statically; <SessionGate />
// streams in once the session resolves and either redirects or renders the
// inquiry view.
export default function SentInquiriesPage() {
  return (
    <Suspense fallback={null}>
      <SessionGate />
    </Suspense>
  );
}

async function SessionGate() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/prisijungti?callbackUrl=${encodeURIComponent("/paskyra/zinutes")}`);
  }
  if (session.user.role === "PROVIDER") {
    redirect("/tiekejas/zinutes");
  }
  return <SentInquiriesView />;
}
