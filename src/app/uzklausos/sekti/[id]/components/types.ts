export interface MessageData {
  id: string;
  content: string;
  createdAt: string;
  senderId?: string | null;
  senderName?: string;
  sender?: { id?: string; name: string; image?: string | null };
}

export interface ResponseData {
  id: string;
  providerId: string;
  message: string;
  price?: number;
  createdAt: string;
  providerLastReadAt?: string | null;
  clientLastReadAt?: string | null;
  providerBadge?: string | null;
  hasReview?: boolean;
  provider: {
    id: string;
    name: string;
    image?: string | null;
    providerProfile?: {
      location: string;
      isVerified?: boolean;
      isPremium?: boolean;
      isYoungTalent?: boolean;
      isGoat?: boolean;
    };
  };
  messages: MessageData[];
}

export interface RequestData {
  id: string;
  title: string;
  description: string;
  /** Legacy single-category display name (primary). Prefer categoryNames. */
  category: string;
  /** Up to 3 category names, primary first (multi-category support). */
  categoryNames?: string[];
  /** Matching category IDs (same order as categoryNames). */
  categoryIds?: string[];
  location: string;
  budget?: string;
  deadline?: string;
  attachmentUrls?: string[];
  status: string;
  moderationStatus?: string;
  acceptedResponseId?: string;
  clientId?: string | null;
  clientName: string;
  createdAt: string;
  viewCount?: number;
  responses: ResponseData[];
}

export type SortMode = "newest" | "price-asc" | "price-desc" | "active";
export type FilterMode = "all" | "awaiting";

export function lastMessageOf(resp: ResponseData): MessageData | undefined {
  return resp.messages[resp.messages.length - 1];
}

/** True when the provider sent the last word — the client still owes a reply. */
export function isAwaitingClientReply(resp: ResponseData): boolean {
  const last = lastMessageOf(resp);
  const lastSenderId = last ? last.senderId ?? null : resp.providerId;
  return lastSenderId === resp.providerId;
}

export function lastActivityAt(resp: ResponseData): string {
  return lastMessageOf(resp)?.createdAt ?? resp.createdAt;
}

export function comparePrice(a: ResponseData, b: ResponseData, dir: "asc" | "desc"): number {
  if (a.price == null && b.price == null) return 0;
  if (a.price == null) return 1;
  if (b.price == null) return -1;
  return dir === "asc" ? a.price - b.price : b.price - a.price;
}
