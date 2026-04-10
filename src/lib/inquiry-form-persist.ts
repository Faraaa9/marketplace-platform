/**
 * Persist and restore direct inquiry form state via sessionStorage.
 * Used when guest is redirected to login (existing account) and back.
 */

const STORAGE_KEY = "pending-inquiry-form";

export interface InquiryFormState {
  providerId: string;
  description: string;
  budget: string;
  senderPhone: string;
  senderName: string;
  senderEmail: string;
}

export function saveInquiryForm(state: InquiryFormState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage not available (SSR, private browsing limit)
  }
}

export function loadInquiryForm(providerId: string): InquiryFormState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as InquiryFormState;
    // Only restore if it's for the same provider
    if (parsed.providerId !== providerId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearInquiryForm(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // silent
  }
}
