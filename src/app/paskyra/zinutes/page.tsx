import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import SentInquiriesView from "./SentInquiriesView";

export const metadata: Metadata = {
  title: "Žinutės | PaslaugųRinka",
  description: "Pokalbiai, kuriuos pradėjote rašydami tiekėjams.",
};

export const dynamic = "force-dynamic";

export default async function SentInquiriesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/prisijungti?callbackUrl=${encodeURIComponent("/paskyra/zinutes")}`);
  }
  if (session.user.role === "PROVIDER") {
    redirect("/tiekejas/zinutes");
  }
  return <SentInquiriesView />;
}
