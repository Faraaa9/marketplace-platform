import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIProfileSetup } from "@/app/kontaktai/AIProfileSetup";

export const metadata: Metadata = {
  title: "Sukurti meistro profilį | PaslaugųRinka",
  description:
    "Greitai sukurkite savo meistro profilį su AI pagalba. Tik nurodykite URL ir mes užpildysime visą informaciją.",
};

export const dynamic = "force-dynamic";

export default async function CreateProviderProfilePage() {
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
      <AIProfileSetup />
    </div>
  );
}
