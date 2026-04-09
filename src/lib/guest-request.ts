const STORAGE_KEY = "pr_recent_request";
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface GuestRequestInfo {
  token: string;
  title: string;
  createdAt: number; // timestamp ms
}

export function saveGuestRequest(token: string, title: string): void {
  try {
    const info: GuestRequestInfo = { token, title, createdAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(info));
  } catch {
    // localStorage unavailable (SSR, private browsing overflow)
  }
}

export function getGuestRequest(): GuestRequestInfo | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const info: GuestRequestInfo = JSON.parse(raw);
    if (Date.now() - info.createdAt > MAX_AGE_MS) {
      clearGuestRequest();
      return null;
    }
    return info;
  } catch {
    return null;
  }
}

export function clearGuestRequest(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // noop
  }
}
