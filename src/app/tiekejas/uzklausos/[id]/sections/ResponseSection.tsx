import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, CheckCircle, AlertTriangle, Settings } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { isLeadUnlocked } from "@/lib/credits";
import { checkEligibility } from "@/lib/provider-eligibility";
import { formatRelativeDate } from "@/lib/utils";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Skeleton from "@/components/ui/Skeleton";
import type { ThreadMessage } from "@/store/useConversationStore";
import LeadCopilotCard from "../LeadCopilotCard";
import UnlockCard from "../UnlockCard";
import ResponseForm from "../ResponseForm";
import ResponseThread from "../ResponseThread";

export async function ResponseSection({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await requireActiveProvider();
  if (!guard.authorized) redirect("/tiekejas");

  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    select: {
      status: true,
      acceptedResponseId: true,
      clientId: true,
      clientName: true,
      client: { select: { image: true } },
      clientEmail: true,
      clientPhone: true,
      categoryRef: { select: { id: true, rootId: true } },
      responses: {
        where: { providerId: guard.userId },
        select: {
          id: true,
          message: true,
          price: true,
          createdAt: true,
          clientLastReadAt: true,
          provider: { select: { id: true, name: true } },
          messages: {
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
              senderName: true,
              sender: { select: { id: true, name: true, image: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!request) notFound();

  // Mark this provider's conversation thread as read — best-effort.
  try {
    await prisma.response.updateMany({
      where: { requestId: id, providerId: guard.userId },
      data: { providerLastReadAt: new Date() },
    });
  } catch {
    // read tracking must never break the page
  }

  const [totalResponses, profile, unlocked] = await Promise.all([
    prisma.response.count({ where: { requestId: id } }),
    prisma.providerProfile.findUnique({
      where: { id: guard.providerProfileId },
      select: {
        categories: { select: { category: { select: { id: true, rootId: true } } } },
      },
    }),
    isLeadUnlocked(guard.providerProfileId, id),
  ]);

  const providerCategories = (profile?.categories ?? []).map((c) => c.category);
  const eligibility = checkEligibility(
    guard.userId,
    { status: request.status, clientId: request.clientId, category: request.categoryRef },
    providerCategories,
  );

  const hasResponded = request.responses.some((r) => r.provider.id === guard.userId);
  const myResponse = request.responses.find((r) => r.provider.id === guard.userId);
  const isMyResponseAccepted = myResponse != null && request.acceptedResponseId === myResponse.id;
  const canRespond = eligibility.allowed;
  const clientEmail = unlocked ? request.clientEmail : null;
  const clientPhone = unlocked ? request.clientPhone : null;

  return (
    <>
      {!hasResponded && canRespond && <LeadCopilotCard requestId={id} />}

      {/* Unlock card — eligible but not yet unlocked */}
      {!hasResponded && canRespond && !unlocked && (
        <UnlockCard requestId={id} creditBalance={guard.creditBalance} />
      )}

      {/* Response form — eligible and unlocked */}
      {!hasResponded && canRespond && unlocked && (
        <ResponseForm requestId={id} totalResponses={totalResponses} />
      )}

      {/* Eligibility warning — specialization mismatch or missing */}
      {!hasResponded && !canRespond && eligibility.code && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-500/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-body-sm font-medium text-amber-800 dark:text-amber-300">
                {eligibility.message}
              </p>
              {(eligibility.code === "NO_SPECIALIZATIONS" || eligibility.code === "SPECIALIZATION_MISMATCH") && (
                <Link
                  href="/tiekejas/profilis"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-caption font-semibold text-white hover:bg-amber-700 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  Redaguoti profilį
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {isMyResponseAccepted && (
        <div className="mb-6 rounded-2xl border border-emerald-200/70 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/30">
          <div className="flex items-start gap-3.5 p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-xs dark:bg-emerald-500/10">
              <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-heading-3 font-semibold text-surface-900 dark:text-white">
                Klientas priėmė jūsų pasiūlymą
              </h3>
              <p className="mt-1 text-body-sm text-surface-600 dark:text-surface-300">
                Sveikiname! Liko susisiekti su klientu ir suderinti darbo detales.
              </p>
            </div>
          </div>

          {(clientEmail || clientPhone) && (
            <div className="border-t border-emerald-200/60 px-5 py-4 dark:border-emerald-800/40">
              <p className="mb-2.5 text-caption font-semibold text-surface-500 dark:text-surface-400">
                Kliento kontaktai
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                {clientEmail && (
                  <a
                    href={`mailto:${clientEmail}`}
                    className="flex min-h-[44px] flex-1 items-center gap-2.5 rounded-xl border border-surface-200/70 bg-white px-3.5 py-2 transition-shadow hover:shadow-soft dark:border-surface-700/50 dark:bg-surface-900"
                  >
                    <Mail className="h-4 w-4 shrink-0 text-surface-400" />
                    <span className="min-w-0 flex-1 truncate text-body-sm text-surface-700 dark:text-surface-200">
                      {clientEmail}
                    </span>
                    <span className="shrink-0 text-caption font-semibold text-brand-600 dark:text-brand-400">
                      Rašyti
                    </span>
                  </a>
                )}
                {clientPhone && (
                  <a
                    href={`tel:${clientPhone}`}
                    className="flex min-h-[44px] flex-1 items-center gap-2.5 rounded-xl border border-surface-200/70 bg-white px-3.5 py-2 transition-shadow hover:shadow-soft dark:border-surface-700/50 dark:bg-surface-900"
                  >
                    <Phone className="h-4 w-4 shrink-0 text-surface-400" />
                    <span className="min-w-0 flex-1 truncate text-body-sm text-surface-700 dark:text-surface-200">
                      {clientPhone}
                    </span>
                    <span className="shrink-0 text-caption font-semibold text-brand-600 dark:text-brand-400">
                      Skambinti
                    </span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {hasResponded && !isMyResponseAccepted && (
        <div className="mb-4 rounded-xl bg-emerald-50 p-3 text-body-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
          Jūs jau atsakėte į šią užklausą
        </div>
      )}

      {request.status !== "OPEN" && !hasResponded && (
        <div className="mb-4 rounded-xl bg-surface-100 p-3 text-body-sm text-surface-500 dark:bg-surface-800 dark:text-surface-400">
          Ši užklausa nebepriima naujų pasiūlymų
        </div>
      )}

      {/* My response */}
      <h2 className="text-heading-2 font-semibold text-surface-900 dark:text-white mb-4">
        Mano atsakymas
        {totalResponses != null && (
          <span className="text-body-sm font-normal text-surface-400 ml-2">(iš viso atsakymų: {totalResponses})</span>
        )}
      </h2>
      <div className="space-y-4">
        {request.responses.map((resp) => {
          const isAccepted = request.acceptedResponseId === resp.id;
          const initialMessages: ThreadMessage[] = resp.messages.map((m) => ({
            id: m.id,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
            senderId: m.senderId,
            senderName: m.senderName ?? m.sender?.name ?? null,
            sender: m.sender ? { id: m.sender.id, name: m.sender.name ?? "", image: m.sender.image } : null,
            status: "sent" as const,
          }));
          return (
            <Card
              key={resp.id}
              className={isAccepted ? "border-emerald-500 ring-2 ring-emerald-500" : undefined}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-body font-medium text-surface-900 dark:text-white">{resp.provider.name}</p>
                  {isAccepted && <Badge variant="success">Priimtas</Badge>}
                </div>
                {resp.price != null && <span className="text-heading-3 font-bold text-emerald-600 dark:text-emerald-400">&euro;{resp.price}</span>}
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <div className="max-w-[80%] rounded-2xl rounded-br-md bg-brand-600 px-3.5 py-2 text-body-sm text-white whitespace-pre-wrap break-words">
                  {resp.message}
                </div>
                <span className="px-1 text-micro text-surface-400">{formatRelativeDate(resp.createdAt)}</span>
              </div>

              {/* Thread with optimistic messaging — client island, hydrates with server messages */}
              <ResponseThread
                responseId={resp.id}
                initialMessages={initialMessages}
                currentSenderName={resp.provider.name || "Tiekėjas"}
                providerId={resp.provider.id}
                otherParticipantName={request.clientName}
                otherParticipantImage={request.client?.image}
                otherParticipantReadAt={resp.clientLastReadAt ? resp.clientLastReadAt.toISOString() : null}
                disabled={request.status === "CLOSED"}
              />
            </Card>
          );
        })}
      </div>
    </>
  );
}

export function ResponseSectionSkeleton() {
  return (
    <>
      <div className="mb-6 rounded-2xl border border-surface-200/60 bg-white p-6 shadow-soft dark:border-surface-700/50 dark:bg-surface-900/50">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 space-y-3">
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-40 rounded-lg" />
        </div>
      </div>

      <Skeleton className="mb-4 h-7 w-48" />
      <div className="space-y-4">
        <div className="rounded-2xl border border-surface-200/60 bg-white p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="flex items-start justify-between gap-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16" />
          </div>
          <div className="mt-3 flex justify-end">
            <Skeleton className="h-10 w-3/5 rounded-2xl" />
          </div>
        </div>
      </div>
    </>
  );
}
