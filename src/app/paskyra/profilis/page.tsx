import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = {
  title: "Mano profilis | PaslaugųRinka",
  description: "Tvarkykite pagrindinius kliento profilio kontaktus.",
};

export const dynamic = "force-dynamic";

export default async function ClientProfilePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/prisijungti?callbackUrl=${encodeURIComponent("/paskyra/profilis")}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      emailVerified: true,
      phoneVerifiedAt: true,
      createdAt: true,
      _count: { select: { serviceRequests: true } },
    },
  });

  if (!user) {
    redirect("/prisijungti");
  }

  return <ProfileForm initialProfile={user} />;
}
