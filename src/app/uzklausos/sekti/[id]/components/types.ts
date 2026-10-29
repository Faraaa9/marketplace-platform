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
      rating?: number | null;
      reviewCount?: number;
    };
  };
  messages: MessageData[];
}

/** True when something happened in this thread (new proposal or a provider
 *  message) since the client's last visit — drives the "Nauji" group. */
export function isUnreadByClient(resp: ResponseData): boolean {
  const lastRead = resp.clientLastReadAt ? Date.parse(resp.clientLastReadAt) : 0;
  if (Date.parse(resp.createdAt) > lastRead) return true;
  return resp.messages.some(
    (m) => m.senderId === resp.providerId && Date.parse(m.createdAt) > lastRead,
  );
}

export function comparePrice(a: ResponseData, b: ResponseData, dir: "asc" | "desc"): number {
  if (a.price == null && b.price == null) return 0;
  if (a.price == null) return 1;
  if (b.price == null) return -1;
  return dir === "asc" ? a.price - b.price : b.price - a.price;
}
