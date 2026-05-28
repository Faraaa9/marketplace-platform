import { notFound, redirect } from "next/navigation";
import { User, Mail, Phone, Lock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { isLeadUnlocked } from "@/lib/credits";
import { getPresenceLevel, formatLastSeen } from "@/lib/presence";
import Card from "@/components/ui/Card";
import Skeleton from "@/components/ui/Skeleton";
import RequestPhotos from "@/components/requests/RequestPhotos";

export async function RequestBody({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireActiveProvider();
  if (!guard.authorized) redirect("/tiekejas");

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    select: {
      description: true,
      attachmentUrls: true,
      clientId: true,
      clientName: true,
      client: { select: { image: true, name: true, lastSeenAt: true } },
      clientEmail: true,
      clientPhone: true,
    },
  });

  if (!request) notFound();

  const unlocked = await isLeadUnlocked(guard.providerProfileId, id);

  // Record this provider's view of the request (deduped per provider, best-effort).
  if (request.clientId !== guard.userId) {
    try {
      await prisma.requestView.upsert({
        where: { requestId_providerId: { requestId: id, providerId: guard.userId } },
        create: { requestId: id, providerId: guard.userId },
        update: {},
      });
    } catch {
      // view tracking must never break the page
    }
  }

  const clientEmail = unlocked ? request.clientEmail : null;
  const clientPhone = unlocked ? request.clientPhone : null;
  const presenceLevel = getPresenceLevel(request.client?.lastSeenAt);
  const presenceLabel = formatLastSeen(request.client?.lastSeenAt);

  return (
    <Card className="mb-6">
      <p className="text-body text-surface-700 dark:text-surface-300 whitespace-pre-wrap mb-4">{request.description}</p>
      {request.attachmentUrls && request.attachmentUrls.length > 0 && (
        <div className="mb-4">
          <RequestPhotos urls={request.attachmentUrls} />
        </div>
      )}
      <hr className="border-surface-200/50 dark:border-surface-700 mb-3" />
      <div className="flex flex-wrap gap-4 text-body-sm text-surface-500">
        <span className="flex items-center gap-1.5"><User className="h-4 w-4" />{request.clientName}</span>
        {presenceLabel && (
          <span
            className={`flex items-center gap-1.5 ${
              presenceLevel === "online"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-surface-500 dark:text-surface-400"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                presenceLevel === "online" ? "bg-emerald-500" : "bg-surface-400"
              }`}
              aria-hidden
            />
            {presenceLabel}
          </span>
        )}
        {clientEmail ? (
          <span className="flex items-center gap-1.5"><Mail className="h-4 w-4" />{clientEmail}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-surface-400"><Lock className="h-4 w-4" />El. paštas — užrakinta</span>
        )}
        {clientPhone ? (
          <span className="flex items-center gap-1.5"><Phone className="h-4 w-4" />{clientPhone}</span>
        ) : (
          <span className="flex items-center gap-1.5 text-surface-400"><Lock className="h-4 w-4" />Telefonas — užrakinta</span>
        )}
      </div>
    </Card>
  );
}

export function RequestBodySkeleton() {
  return (
    <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="mt-4 border-t border-surface-200/50 dark:border-surface-700 pt-3 flex flex-wrap gap-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
