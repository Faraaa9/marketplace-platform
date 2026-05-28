import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Skeleton from "@/components/ui/Skeleton";
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

  return (
    <Suspense fallback={<ProfileFormSkeleton />}>
      <ProfileFormLoader userId={session.user.id} />
    </Suspense>
  );
}

async function ProfileFormLoader({ userId }: { userId: string }) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
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

  if (!user) redirect("/prisijungti");

  return <ProfileForm initialProfile={user} />;
}

function ProfileFormSkeleton() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="mt-2 h-4 w-72" />

        <div className="mt-6 space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
