import { notFound } from "next/navigation";
import Link from "next/link";
import TelegramSourceBadge from "@/components/TelegramSourceBadge";
import { BUTTON_GHOST, Chip, Notice, StepBar } from "@/components/account/ui";
import { requestStatusChip, requestStep } from "@/lib/account/request-progress";
import { decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";
import RequestActions, { BackToRequests, ResendConfirmation } from "../RequestActions";
import { getTrackedRequestSummary } from "../data";

interface RequestHeaderProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ verification?: string; delivery?: string }>;
}

export default async function RequestHeader({ params, searchParams }: RequestHeaderProps) {
  const { id } = await params;
  const request = await getTrackedRequestSummary(id);
  if (!request) notFound();

  const { verification: verificationState, delivery: deliveryState } = await searchParams;

  const progress = {
    status: request.status,
    moderationStatus: request.moderationStatus,
    responseCount: request.responseCount,
    acceptedResponseId: request.acceptedResponseId,
    reviewed: request.acceptedReviewed,
  };
  const chip = requestStatusChip(progress);
  const categoryLabel = (request.categoryNames.length > 0 ? request.categoryNames : [request.category])
    .filter(Boolean)
    .join(" · ");
  const isOpen = request.status === "OPEN";
  const isApproved = request.moderationStatus !== "PENDING" && request.moderationStatus !== "REJECTED";
  const publicHref = isApproved && isOpen
    ? `/uzklausos?search=${encodeURIComponent(request.title)}&open=${encodeURIComponent(request.id)}#uzklausa-${request.id}`
    : null;

  return (
    <div className="flex flex-col gap-4">
      <BackToRequests />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Chip tone={chip.tone}>{chip.label}</Chip>
            {request.source === "telegram" && <TelegramSourceBadge />}
          </div>
          <h1 className="mt-2.5 font-serif text-[26px] font-semibold leading-tight text-surface-900 dark:text-white sm:text-[28px]">
            {decodeHtmlEntities(request.title)}
          </h1>
          <p className="mt-1.5 text-body-sm text-surface-500">
            {[request.location, categoryLabel, `pateikta ${formatRelativeDate(request.createdAt).toLowerCase()}`]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <RequestActions trackingToken={id} status={request.status} publicHref={publicHref} />
      </div>

      {request.moderationStatus !== "REJECTED" && request.status !== "PENDING_CONFIRMATION" && (
        <StepBar current={requestStep(progress)} />
      )}

      {request.status === "PENDING_CONFIRMATION" && <ResendConfirmation trackingToken={id} />}
      {request.moderationStatus === "PENDING" && (
        <Notice tone="warn" title="Užklausa peržiūrima">
          Jūsų užklausa tikrinama prieš paskelbiant ir kol kas nematoma meistrams. Paprastai peržiūra trunka neilgai.
        </Notice>
      )}
      {request.moderationStatus === "REJECTED" && (
        <Notice tone="error" title="Užklausa nepaskelbta">
          Užklausa neatitiko platformos taisyklių dėl netinkamo turinio. Suredaguokite tekstą ar nuotraukas ir
          bandykite dar kartą.
        </Notice>
      )}
      {verificationState === "success" && (
        <Notice tone="ok">El. paštas patvirtintas. Užklausa aktyvuota ir perduota meistrams.</Notice>
      )}
      {verificationState === "already-confirmed" && <Notice tone="info">Ši užklausa jau buvo patvirtinta anksčiau.</Notice>}
      {verificationState === "expired" && (
        <Notice tone="warn">Patvirtinimo nuoroda nebegalioja. Išsiųskite naują patvirtinimo laišką.</Notice>
      )}
      {deliveryState === "failed" && (
        <Notice tone="error">
          Užklausa sukurta, bet patvirtinimo laiško išsiųsti nepavyko. Galite pabandyti dar kartą šiame puslapyje.
        </Notice>
      )}
      {deliveryState === "mock" && (
        <Notice tone="info">
          Veikiate development režime: vietoj tikro laiško naudokite dev email preview, kad atidarytumėte patvirtinimo
          nuorodą.
        </Notice>
      )}

      {isOpen && isApproved && request.responseCount === 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-brand-200 bg-brand-50/60 px-4 py-3.5 dark:border-brand-800/50 dark:bg-brand-950/30">
          <p className="min-w-0 flex-[1_1_280px]">
            <strong>Pasiūlymų dar nėra.</strong>{" "}
            <span className="text-surface-600 dark:text-surface-300">
              Meistrai jau mato užklausą — su nuotraukomis ir biudžetu atsakymų sulaukiama greičiau.
            </span>
          </p>
          <Link href={`/uzklausos/sekti/${id}/redaguoti#photos`} className={BUTTON_GHOST}>
            Pridėti nuotraukų
          </Link>
          <Link href={`/uzklausos/sekti/${id}/redaguoti#budget`} className={BUTTON_GHOST}>
            Nurodyti biudžetą
          </Link>
        </div>
      )}
    </div>
  );
}
