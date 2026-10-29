import type { ChipTone } from "@/components/account/ui";

/** Days an OPEN request may sit idle before the expiry cron closes it. Lives
 *  here (not in request-expiry) so client-side stamp text can use it too. */
export const REQUEST_EXPIRY_DAYS = 30;

export interface RequestOutcomeStamp {
  tone: "found" | "not-found" | "closed";
  lead: string;
  main: string;
  note?: string;
}

/**
 * The rubber stamp for a request that no longer takes offers; null while it is
 * still OPEN (or not yet confirmed). A customer who closes without choosing a
 * provider gets a neutral stamp: "not found in 30 days" would be untrue there.
 */
export function requestOutcomeStamp(r: { status: string; acceptedResponseId: string | null }): RequestOutcomeStamp | null {
  if (r.status === "OPEN" || r.status === "PENDING_CONFIRMATION") return null;
  // IN_PROGRESS without an accepted offer exists too (admin-set status).
  if (r.acceptedResponseId || r.status === "IN_PROGRESS") return { tone: "found", lead: "Tiekėjas", main: "Rastas" };
  if (r.status === "EXPIRED") {
    return { tone: "not-found", lead: "Tiekėjas", main: "Nerastas", note: `per ${REQUEST_EXPIRY_DAYS} dienų` };
  }
  if (r.status === "CLOSED") return { tone: "closed", lead: "Užklausa", main: "Uždaryta" };
  return null;
}

/** The minimum a request needs to place it on the 5-step customer timeline
 *  (Pateikta → Pasiūlymai → Meistras pasirinktas → Atlikta → Įvertinta). */
export interface RequestProgressInput {
  status: string;
  moderationStatus?: string | null;
  responseCount: number;
  acceptedResponseId: string | null;
  /** A review exists for the accepted response. */
  reviewed: boolean;
}

/** Index of the step the request is at (shown as "now"); earlier steps are
 *  done. Returns 5 once the accepted work has been reviewed (all done). */
export function requestStep(r: RequestProgressInput): number {
  if (r.acceptedResponseId) {
    if (r.reviewed) return 5;
    return r.status === "CLOSED" ? 3 : 2;
  }
  return r.responseCount > 0 ? 1 : 0;
}

/** A request the customer can still rate: a master was picked, no review yet. */
export function canRate(r: RequestProgressInput): boolean {
  return !!r.acceptedResponseId && !r.reviewed && (r.status === "IN_PROGRESS" || r.status === "CLOSED");
}

export function requestStatusChip(r: RequestProgressInput): { label: string; tone: ChipTone } {
  if (r.moderationStatus === "PENDING") return { label: "Peržiūrima", tone: "warn" };
  if (r.moderationStatus === "REJECTED") return { label: "Nepaskelbta", tone: "closed" };
  if (r.status === "PENDING_CONFIRMATION") return { label: "Laukia patvirtinimo", tone: "warn" };
  if (r.acceptedResponseId) {
    if (canRate(r) && r.status === "CLOSED") return { label: "Atlikta — įvertinkite", tone: "closed" };
    if (r.status === "CLOSED") return { label: "Užbaigta", tone: "closed" };
    return { label: "Meistras pasirinktas", tone: "progress" };
  }
  if (r.status === "CLOSED") return { label: "Uždaryta", tone: "closed" };
  if (r.status === "EXPIRED") return { label: "Nebegalioja", tone: "closed" };
  return r.responseCount > 0
    ? { label: "Gauta pasiūlymų", tone: "open" }
    : { label: "Laukiama pasiūlymų", tone: "wait" };
}

/** Unread rule shared by the customer inbox and its sidebar badge: the
 *  provider spoke last after the customer's last visit. A brand-new offer with
 *  no chat yet counts (the offer is the provider's message); a direct inquiry
 *  with no reply does not. */
export function isCustomerThreadUnread(t: {
  lastSenderId: string | null | undefined;
  providerId: string;
  lastMessageAt: Date;
  lastReadAt: Date | null;
  offerCreatedAt?: Date;
}): boolean {
  const lastRead = t.lastReadAt?.getTime() ?? 0;
  if (t.lastSenderId === undefined) return !!t.offerCreatedAt && t.offerCreatedAt.getTime() > lastRead;
  return t.lastSenderId === t.providerId && t.lastMessageAt.getTime() > lastRead;
}
