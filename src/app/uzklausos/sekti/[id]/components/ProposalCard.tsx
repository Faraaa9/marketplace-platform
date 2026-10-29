"use client";

import VerifiedBadge from "@/components/ui/VerifiedBadge";
import { Avatar, BUTTON_GHOST, BUTTON_PRIMARY } from "@/components/account/ui";
import { cn, decodeHtmlEntities, formatRelativeDate, ltCount } from "@/lib/utils";
import type { ResponseData } from "./types";

interface ProposalCardProps {
  resp: ResponseData;
  /** "offer" = an offer the customer hasn't seen; "message" = unread reply. */
  unread: "offer" | "message" | null;
  isPicked: boolean;
  dimmed: boolean;
  canPick: boolean;
  accepting: boolean;
  chatOpen: boolean;
  onPick: () => void;
  onChat: () => void;
}

function ratingLabel(resp: ResponseData) {
  const profile = resp.provider.providerProfile;
  if (profile?.rating && profile.reviewCount) {
    return `★ ${profile.rating.toFixed(1)} · ${ltCount(profile.reviewCount, ["atsiliepimas", "atsiliepimai", "atsiliepimų"])}`;
  }
  return "Naujas meistras · atsiliepimų dar nėra";
}

export default function ProposalCard({
  resp,
  unread,
  isPicked,
  dimmed,
  canPick,
  accepting,
  chatOpen,
  onPick,
  onChat,
}: ProposalCardProps) {
  const profile = resp.provider.providerProfile;
  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-xl border bg-white p-4 transition-opacity dark:bg-surface-900",
        isPicked
          ? "border-emerald-600 shadow-[0_0_0_2px_rgb(16_185_129/0.2)]"
          : "border-surface-100 dark:border-surface-800",
        dimmed && "opacity-55",
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={resp.provider.name} image={resp.provider.image} />
        <div className="min-w-0">
          <p className="flex items-center gap-1 truncate font-semibold text-surface-900 dark:text-white">
            <span className="truncate">{resp.provider.name}</span>
            {profile?.isVerified && <VerifiedBadge tier="verified" size="sm" />}
            {profile?.isPremium && <VerifiedBadge tier="premium" size="sm" />}
          </p>
          <p className="text-caption font-normal text-surface-500">{ratingLabel(resp)}</p>
        </div>
      </div>

      {unread && (
        <span className="text-[11px] font-bold uppercase tracking-wide text-brand-700 dark:text-brand-400">
          {unread === "offer" ? "Naujas pasiūlymas" : "Nauja žinutė"}
        </span>
      )}

      <div>
        <p className="text-[22px] font-bold leading-tight text-surface-900 dark:text-white">
          {resp.price != null ? `${resp.price.toLocaleString("lt-LT")} €` : "Kaina po apžiūros"}
        </p>
        <p className="text-caption font-normal text-surface-500">
          {[profile?.location, `atsiųsta ${formatRelativeDate(resp.createdAt).toLowerCase()}`].filter(Boolean).join(" · ")}
        </p>
      </div>

      <p className="line-clamp-6 whitespace-pre-wrap break-words leading-relaxed text-surface-700 dark:text-surface-300">
        {decodeHtmlEntities(resp.message)}
      </p>

      <div className="mt-auto flex flex-wrap items-center gap-2">
        <button type="button" onClick={onChat} aria-pressed={chatOpen} className={BUTTON_GHOST}>
          Rašyti
        </button>
        {canPick && (
          <button type="button" onClick={onPick} disabled={accepting} className={BUTTON_PRIMARY}>
            {accepting ? "Renkamasi…" : "Pasirinkti"}
          </button>
        )}
        {isPicked && <span className="text-caption font-semibold text-emerald-700 dark:text-emerald-400">✓ Pasirinktas</span>}
      </div>
    </article>
  );
}
