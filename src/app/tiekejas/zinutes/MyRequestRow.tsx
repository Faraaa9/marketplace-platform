"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { decodeHtmlEntities, formatRelativeDate } from "@/lib/utils";

export interface MyRequestOffer {
  id: string;
  providerName: string;
  providerImage: string | null;
  price: number | null;
  preview: string;
  lastMessageAt: string;
  unread: boolean;
}

export interface MyRequestItem {
  id: string;
  trackingToken: string;
  title: string;
  status: string;
  lastActivityAt: string;
  responseCount: number;
  /** Threads (providers) with something new — NOT message count. */
  unreadCount: number;
  offers: MyRequestOffer[];
}

function pasiulymaiLabel(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} pasiūlymas`;
  if (mod10 >= 2 && mod10 <= 9 && (mod100 < 11 || mod100 > 19)) {
    return `${count} pasiūlymai`;
  }
  return `${count} pasiūlymų`;
}

function offerInitials(name: string) {
  const parts = decodeHtmlEntities(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function OfferRow({ offer, onOpen }: { offer: MyRequestOffer; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-[#F1E7DA] dark:hover:bg-surface-800 ${
        offer.unread ? "bg-[#FDF6EC] dark:bg-surface-800/60" : ""
      }`}
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-[#EFE7DB] text-[11px] font-bold text-[#6F6258]">
        {offer.providerImage ? (
          <Image
            src={offer.providerImage}
            alt=""
            width={36}
            height={36}
            sizes="36px"
            className="h-full w-full object-cover"
          />
        ) : (
          offerInitials(offer.providerName)
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-2">
          <span
            className={`min-w-0 truncate text-body-sm ${
              offer.unread ? "font-bold text-[#111827]" : "font-semibold text-[#1E1B18]"
            } dark:text-white`}
          >
            {decodeHtmlEntities(offer.providerName)}
          </span>
          {offer.price != null && (
            <span className="ml-auto shrink-0 text-[12px] font-bold text-[#A84E2E]">
              {offer.price} €
            </span>
          )}
        </span>
        <span
          className={`block truncate text-[12px] ${
            offer.unread ? "font-medium text-[#1E1B18]" : "text-[#6B6760]"
          } dark:text-surface-400`}
        >
          {decodeHtmlEntities(offer.preview)}
        </span>
        <span className="block text-[11px] text-[#9A917F] dark:text-surface-500">
          {formatRelativeDate(new Date(offer.lastMessageAt))}
        </span>
      </span>
      {offer.unread && (
        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-[#A84E2E]" />
      )}
    </button>
  );
}

/** A submitted request as an inbox row: title + green "Gyvai" + "N pasiūlymų ·
 *  prieš X", unread badge counts providers with news (not messages). Clicking
 *  expands the row vertically into the offers list (Nauji first), per
 *  mockups/uzklausu-hierarchija.html. */
export default function MyRequestRow({
  request,
  expanded,
  onToggle,
  onOpenOffer,
}: {
  request: MyRequestItem;
  expanded: boolean;
  onToggle: () => void;
  onOpenOffer: (request: MyRequestItem, offer: MyRequestOffer) => void;
}) {
  const unreadOffers = request.offers.filter((o) => o.unread);
  const readOffers = request.offers.filter((o) => !o.unread);
  const showGroups = unreadOffers.length > 0 && readOffers.length > 0;

  return (
    <div className="border-b border-[#DDD3C5] bg-[#FFFDF8] dark:border-surface-700/60 dark:bg-surface-950/40">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="block w-full px-3 py-3.5 text-left transition-colors hover:bg-[#F1E7DA] dark:hover:bg-surface-800/70"
      >
        <span className="flex items-center gap-2">
          <span
            className={`min-w-0 flex-1 truncate text-body-sm ${
              request.unreadCount > 0 ? "font-bold text-[#111827]" : "font-semibold text-[#1E1B18]"
            } dark:text-white`}
          >
            {decodeHtmlEntities(request.title)}
          </span>
          {request.unreadCount > 0 && (
            <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[#A84E2E] px-1.5 text-[11px] font-bold text-white">
              {request.unreadCount}
            </span>
          )}
          <ChevronDown
            aria-hidden
            className={`h-4 w-4 shrink-0 text-[#9A917F] transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </span>
        <span className="mt-1 flex items-center gap-2 text-[12px] text-[#6F6258] dark:text-surface-400">
          {request.status === "OPEN" ? (
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-emerald-500 motion-safe:animate-pulse"
              />
              Gyvai
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center rounded-full bg-[#EFE7DB] px-2 py-0.5 text-[11px] font-semibold text-[#6F6258] dark:bg-surface-800 dark:text-surface-300">
              Laukia patvirtinimo
            </span>
          )}
          <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-[#C9C1B2]" />
          <span>{pasiulymaiLabel(request.responseCount)}</span>
          <span aria-hidden className="h-[3px] w-[3px] rounded-full bg-[#C9C1B2]" />
          <span>{formatRelativeDate(new Date(request.lastActivityAt))}</span>
        </span>
      </button>

      {expanded && (
        <div className="space-y-0.5 px-2 pb-2.5">
          {request.offers.length === 0 ? (
            <p className="px-2.5 pb-1 text-[12px] text-[#6B6760] dark:text-surface-400">
              Kol kas pasiūlymų nėra - tiekėjai netrukus peržiūrės.
            </p>
          ) : (
            <>
              {showGroups && (
                <p className="px-2.5 pt-1 text-[10px] font-semibold uppercase tracking-wide text-[#9A917F]">
                  Nauji
                </p>
              )}
              {unreadOffers.map((offer) => (
                <OfferRow key={offer.id} offer={offer} onOpen={() => onOpenOffer(request, offer)} />
              ))}
              {showGroups && (
                <p className="px-2.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#9A917F]">
                  Peržiūrėti
                </p>
              )}
              {readOffers.map((offer) => (
                <OfferRow key={offer.id} offer={offer} onOpen={() => onOpenOffer(request, offer)} />
              ))}
            </>
          )}
          <Link
            href={`/uzklausos/sekti/${request.trackingToken}/redaguoti`}
            className="block px-2.5 pt-1 text-[12px] font-medium text-[#A84E2E] hover:underline"
          >
            Redaguoti užklausą →
          </Link>
        </div>
      )}
    </div>
  );
}
