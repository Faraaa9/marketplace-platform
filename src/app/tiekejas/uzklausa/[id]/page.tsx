import { redirect } from "next/navigation";
import { connection } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProviderRequestRedirectPage({ params }: PageProps) {
  await connection();
  const { id } = await params;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect(`/prisijungti?callbackUrl=${encodeURIComponent(`/tiekejas/zinutes?request=${id}`)}`);
  }

  const response = await prisma.response.findFirst({
    where: { requestId: id, providerId: session.user.id },
    select: { id: true },
  });

  if (response) {
    redirect(`/tiekejas/zinutes?thread=response-${response.id}`);
  }

  redirect(`/tiekejas/zinutes?request=${id}`);
}
