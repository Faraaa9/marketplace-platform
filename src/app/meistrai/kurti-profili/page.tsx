import { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { QuickOnboard } from "./QuickOnboard";

export const metadata: Metadata = {
  title: "Sukurti meistro profilį | PaslaugųRinka",
  description:
    "Sukurkite meistro profilį per minutę — vardas, sritis, miestas, telefonas. Ir tave randa klientai.",
};


export default function CreateProviderProfilePage() {
  // Session + role check streams inside Suspense so the page shell can
  // prerender (Cache Components requirement).
  return (
    <Suspense fallback={null}>
      <SessionGate />
    </Suspense>
  );
}

async function SessionGate() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(
      `/prisijungti?callbackUrl=${encodeURIComponent("/meistrai/kurti-profili")}`
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { providerProfile: true },
  });

  if (!user) {
    redirect("/prisijungti");
  }

  // TODO: laikinas testavimo režimas — atstatyti pries production
  // if (user.providerProfile) {
  //   redirect(`/paskyra/profilis`);
  // }

  // Ensure user has PROVIDER role
  if (user.role !== "PROVIDER") {
    await prisma.user.update({
      where: { id: user.id },
      data: { role: "PROVIDER" },
    });
  }

  return (
    <div className="min-h-screen py-12">
      <QuickOnboard name={user.name ?? ""} />
    </div>
  );
}
