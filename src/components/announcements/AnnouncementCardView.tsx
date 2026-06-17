import {
  Lightbulb,
  Sparkles,
  Megaphone,
  Gift,
  Rocket,
  Info,
  type LucideIcon,
} from "lucide-react";
import type { AnnouncementCardData } from "@/lib/announcements";

const ICONS: Record<string, LucideIcon> = {
  lightbulb: Lightbulb,
  sparkles: Sparkles,
  megaphone: Megaphone,
  gift: Gift,
  rocket: Rocket,
  info: Info,
};

/** Presentational card body. Wrapped by DismissibleCard for the X. */
export function AnnouncementCardView({ card }: { card: AnnouncementCardData }) {
  const Icon = ICONS[card.icon] ?? Lightbulb;
  const external = card.ctaHref ? /^https?:\/\//.test(card.ctaHref) : false;

  return (
    <section className="rounded-[20px] border border-[#DED7CC] bg-white p-4 pr-12 shadow-[0_12px_32px_rgba(55,42,31,0.08)] dark:border-surface-700 dark:bg-surface-900">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#F6E9E3] text-[#A84E2E]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-body-sm font-semibold text-[#24211D] dark:text-white">
            {card.title}
          </h3>
          <p className="mt-1 whitespace-pre-line text-caption leading-relaxed text-[#6D675F] dark:text-surface-400">
            {card.body}
          </p>
          {card.ctaLabel && card.ctaHref && (
            <a
              href={card.ctaHref}
              target={external ? "_blank" : undefined}
              rel={external ? "noopener noreferrer" : undefined}
              className="mt-2 inline-flex text-caption font-semibold text-[#A84E2E] hover:underline"
            >
              {card.ctaLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
