import { notFound } from "next/navigation";
import Link from "next/link";
import {
  MapPin,
  Clock,
  CalendarClock,
  Euro,
  MessageCircle,
  Eye,
  Search as SearchIcon,
  Handshake,
  ArrowUpRight,
} from "lucide-react";
import Badge from "@/components/ui/Badge";
import { formatRelativeDate } from "@/lib/utils";
import { StatusTimeline } from "../components/TrackingHelpers";
import { getTrackedRequestSummary } from "../data";

interface RequestHeaderProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ verification?: string; delivery?: string }>;
}

const statusMap: Record<string, { label: string; variant: "warning" | "brand" | "default" }> = {
  PENDING_CONFIRMATION: { label: "Laukia patvirtinimo", variant: "warning" },
  OPEN: { label: "Atidaryta", variant: "brand" },
  IN_PROGRESS: { label: "Vykdoma", variant: "brand" },
  CLOSED: { label: "Uždaryta", variant: "default" },
};

export default async function RequestHeader({ params, searchParams }: RequestHeaderProps) {
  const { id } = await params;
  const request = await getTrackedRequestSummary(id);
  if (!request) notFound();

  const { verification: verificationState, delivery: deliveryState } = await searchParams;

  const categoryLabels =
    request.categoryNames.length > 0
      ? request.categoryNames
      : request.category
        ? [request.category]
        : [];

  const status = statusMap[request.status] || statusMap.OPEN;
  const displayStatus =
    request.moderationStatus === "PENDING"
      ? { label: "Peržiūrima", variant: "warning" as const }
      : request.moderationStatus === "REJECTED"
        ? { label: "Atmesta", variant: "default" as const }
        : status;
  const isOpen = request.status === "OPEN";
  const isApproved =
    request.moderationStatus !== "PENDING" && request.moderationStatus !== "REJECTED";
  const publicRequestHref = `/uzklausos?search=${encodeURIComponent(request.title)}&open=${encodeURIComponent(request.id)}#uzklausa-${request.id}`;

  return (
    <>
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Badge variant={displayStatus.variant}>{displayStatus.label}</Badge>
            {categoryLabels.length > 0 && (
              <span className="truncate text-body-sm text-surface-500">
                {categoryLabels.join(" · ")}
              </span>
            )}
          </div>
          {isApproved && (
            <Link
              href={publicRequestHref}
              aria-label="Atidaryti viešą skelbimą"
              title="Atidaryti viešą skelbimą"
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-surface-200/80 bg-white/70 text-surface-500 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 dark:border-surface-700 dark:bg-surface-900/70 dark:text-surface-300 dark:hover:bg-surface-800"
            >
              <ArrowUpRight className="h-4.5 w-4.5" />
            </Link>
          )}
        </div>
        <h1 className="text-heading-1 font-bold text-surface-900 dark:text-white">{request.title}</h1>
        <div className="mt-3 flex flex-wrap gap-4 text-body-sm text-surface-500">
          <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{request.location}</span>
          <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" />{formatRelativeDate(request.createdAt)}</span>
          {request.budget && <span className="flex items-center gap-1.5"><Euro className="h-4 w-4" />{request.budget}</span>}
          {request.deadline && <span className="flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />{request.deadline}</span>}
        </div>
      </div>

      {request.moderationStatus === "PENDING" && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-700 dark:bg-amber-500/10">
          <p className="text-body-sm font-semibold text-amber-900 dark:text-amber-200">
            Užklausa peržiūrima
          </p>
          <p className="mt-0.5 text-body-sm text-amber-800 dark:text-amber-300">
            Jūsų užklausa tikrinama prieš paskelbiant ir kol kas nematoma tiekėjams.
            Paprastai peržiūra trunka neilgai.
          </p>
        </div>
      )}

      {request.moderationStatus === "REJECTED" && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-500/10">
          <p className="text-body-sm font-semibold text-red-900 dark:text-red-200">
            Užklausa nepaskelbta
          </p>
          <p className="mt-0.5 text-body-sm text-red-800 dark:text-red-300">
            Užklausa neatitiko platformos taisyklių dėl netinkamo turinio. Suredaguokite
            tekstą ar nuotraukas ir bandykite dar kartą.
          </p>
        </div>
      )}

      {verificationState === "success" && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-body-sm text-emerald-800 dark:border-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          El. paštas patvirtintas. Užklausa aktyvuota ir perduota tiekėjams.
        </div>
      )}

      {verificationState === "already-confirmed" && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-body-sm text-brand-800 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          Ši užklausa jau buvo patvirtinta anksčiau.
        </div>
      )}

      {verificationState === "expired" && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-body-sm text-amber-800 dark:border-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
          Patvirtinimo nuoroda nebegalioja. Išsiųskite naują patvirtinimo laišką.
        </div>
      )}

      {deliveryState === "failed" && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-body-sm text-red-800 dark:border-red-700 dark:bg-red-500/10 dark:text-red-300">
          Užklausa sukurta, bet patvirtinimo laiško išsiųsti nepavyko. Galite pabandyti dar kartą šiame puslapyje.
        </div>
      )}

      {deliveryState === "mock" && (
        <div className="mb-4 rounded-xl border border-brand-200 bg-brand-50 p-4 text-body-sm text-brand-800 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
          Veikiate development režime: vietoj tikro laiško naudokite dev email preview, kad atidarytumėte patvirtinimo nuorodą.
        </div>
      )}

      <StatusTimeline status={request.status} responseCount={request.responseCount} />

      {isOpen && isApproved && (
        <div className="mb-6 flex items-center gap-1.5 text-body-sm text-surface-500 dark:text-surface-400">
          <Eye className="h-4 w-4 shrink-0" />
          {request.viewCount > 0 ? (
            <span>
              Jūsų užklausą peržiūrėjo tiekėjų:{" "}
              <span className="font-semibold text-surface-700 dark:text-surface-200">{request.viewCount}</span>
            </span>
          ) : (
            <span>Tiekėjai dar neperžiūrėjo — pirmieji peržiūri per kelias valandas.</span>
          )}
        </div>
      )}

      {isOpen && isApproved && request.responseCount === 0 && (
        <div className="mb-6 rounded-2xl border border-surface-200/60 bg-surface-50 p-5 dark:border-surface-700/50 dark:bg-surface-900/50">
          <div className="flex items-center gap-2 mb-1">
            <SearchIcon className="h-4 w-4 text-surface-500 dark:text-surface-400" />
            <p className="text-body-sm font-semibold text-surface-900 dark:text-white">Užklausa aktyvuota</p>
          </div>
          <p className="text-body-sm text-surface-500 dark:text-surface-400">
            Tiekėjai mato jūsų užklausą ir netrukus pradės siųsti pasiūlymus. Paprastai pirmieji pasiūlymai ateina per kelias valandas.
          </p>
        </div>
      )}

      {isOpen && request.responseCount > 0 && !request.acceptedResponseId && (
        <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-5 dark:border-emerald-800/40 dark:bg-emerald-950/30">
          <div className="flex items-center gap-2 mb-1">
            <MessageCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <p className="text-body-sm font-semibold text-emerald-900 dark:text-emerald-200">
              Turite {request.responseCount} {request.responseCount === 1 ? "pasiūlymą" : "pasiūlymus"}!
            </p>
          </div>
          <p className="text-body-sm text-emerald-800/80 dark:text-emerald-300/80">
            Peržiūrėkite pasiūlymus žemiau. Galite rašyti žinutes tiekėjams ir priimti geriausią pasiūlymą.
          </p>
        </div>
      )}

      {request.status === "IN_PROGRESS" && (
        <div className="mb-6 rounded-2xl border border-brand-200/60 bg-brand-50/50 p-5 dark:border-brand-800/40 dark:bg-brand-950/30">
          <div className="flex items-center gap-2 mb-1">
            <Handshake className="h-4 w-4 text-brand-600 dark:text-brand-400" />
            <p className="text-body-sm font-semibold text-brand-900 dark:text-brand-200">Pasiūlymas priimtas</p>
          </div>
          <p className="text-body-sm text-brand-800/80 dark:text-brand-300/80">
            Susisiekite su tiekėju per žinučių sistemą žemiau ir suderinkite darbo detales. Kai darbas bus atliktas, galite uždaryti užklausą.
          </p>
        </div>
      )}
    </>
  );
}
