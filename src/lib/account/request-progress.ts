import type { ChipTone } from "@/components/account/ui";

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
