import { DismissibleCard } from "@/components/ui/DismissibleCard";
import { getActiveAnnouncementCards } from "@/lib/announcements";
import { audiencesForSurface } from "@/lib/announcement-shared";
import { getDismissedCardIds } from "@/lib/dismissible-cards";
import { AnnouncementCardView } from "./AnnouncementCardView";

/**
 * Renders admin-managed announcement cards for a surface. Server-side it filters
 * by audience + active window AND by the per-device dismiss cookie, so a
 * dismissed (or inactive) card never paints — no flash, no layout shift.
 *
 * Must be used inside a dynamic subtree (Suspense + request-time data); both
 * call sites (/tiekejas, /paskyra/uzklausos) already are.
 */
export async function AnnouncementCards({
  surface,
  className,
}: {
  surface: "provider" | "client";
  className?: string;
}) {
  const [cards, dismissed] = await Promise.all([
    getActiveAnnouncementCards(audiencesForSurface(surface)),
    getDismissedCardIds(),
  ]);

  const visible = cards.filter((card) => !dismissed.has(card.id));
  if (visible.length === 0) return null;

  return (
    <div className={className}>
      {visible.map((card) => (
        <DismissibleCard key={card.id} id={card.id} className="mb-3">
          <AnnouncementCardView card={card} />
        </DismissibleCard>
      ))}
    </div>
  );
}
