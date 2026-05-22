const STORAGE_KEY = "pr_listing_draft";
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hour — long enough for an OAuth round-trip

export interface ListingDraft {
  title: string;
  description: string;
  categoryId: string;
  location: string;
  budget: string;
  deadline: string;
  attachmentUrls: string[];
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

/** Stash the in-progress listing before a Google OAuth redirect wipes client state. */
export function saveListingDraft(draft: ListingDraft): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, savedAt: Date.now() }));
  } catch {
    // localStorage unavailable (SSR, private browsing overflow)
  }
}

export function loadListingDraft(): ListingDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { savedAt, ...draft } = JSON.parse(raw) as ListingDraft & { savedAt?: number };
    if (typeof savedAt !== "number" || Date.now() - savedAt > MAX_AGE_MS) {
      clearListingDraft();
      return null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function clearListingDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
