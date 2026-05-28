import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { FileText } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Button from "@/components/ui/Button";
import Skeleton from "@/components/ui/Skeleton";
import ProfileForm from "./ProfileForm";

export const metadata: Metadata = {
  title: "Mano profilis | PaslaugųRinka",
  description: "Tvarkykite pagrindinius kliento profilio kontaktus.",
};


export default function ClientProfilePage() {
  // Cache Components: the static header paints with the prerendered shell, while
  // the session-reading loader streams in under the Suspense boundary below.
  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:py-8">
        <ProfileHeader />
        <Suspense fallback={<ProfileFormSkeleton />}>
          <ProfileFormLoader />
        </Suspense>
      </div>
    </div>
  );
}

function ProfileHeader() {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <div>
        <p className="text-body-sm font-medium text-surface-500 dark:text-surface-400">
          Paskyra
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-surface-900 dark:text-white sm:text-3xl">
          Mano profilis
        </h1>
      </div>
      <Link href="/paskyra/uzklausos">
        <Button variant="outline" size="sm">
          <FileText className="mr-1.5 h-4 w-4" />
          Mano užklausos
        </Button>
      </Link>
    </div>
  );
}

async function ProfileFormLoader() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/prisijungti?callbackUrl=${encodeURIComponent("/paskyra/profilis")}`);
  }
  const userId = session.user.id;
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
  // Mirrors the ProfileForm grid (form card + completeness sidebar) so the
  // streamed form lands without layout shift. The header renders above.
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
      <section className="rounded-2xl border border-surface-200/60 bg-white p-5 shadow-sm dark:border-surface-700/50 dark:bg-surface-900/50">
        <div className="mb-5 flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg sm:w-40" />
        </div>

        <div className="mt-6 border-t border-surface-200/70 pt-5 dark:border-surface-700/50">
          <div className="mb-3 flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="mb-3 h-4 w-full" />
          <Skeleton className="h-10 w-full rounded-lg sm:w-40" />
        </div>
      </section>

      <aside className="rounded-2xl border border-surface-200/60 bg-white p-5 shadow-sm dark:border-surface-700/50 dark:bg-surface-900/50">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="mt-3 h-2 w-full rounded-full" />
        <Skeleton className="mt-2 h-6 w-12" />
        <div className="mt-5 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="mt-5 h-12 w-full rounded-xl" />
      </aside>
    </div>
  );
}
