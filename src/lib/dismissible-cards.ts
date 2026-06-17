import { cookies } from "next/headers";
import {
  DISMISSED_CARDS_COOKIE,
  parseDismissedCards,
} from "./dismissible-cards-shared";

/**
 * Server-side read of which one-off cards the current device has dismissed.
 * Used to gate rendering during SSR so an already-dismissed card never paints
 * (no flash, no layout shift). Reads the cookie the client writes on dismiss.
 */
export async function getDismissedCardIds(): Promise<Set<string>> {
  const store = await cookies();
  return parseDismissedCards(store.get(DISMISSED_CARDS_COOKIE)?.value);
}

export async function isCardDismissed(id: string): Promise<boolean> {
  return (await getDismissedCardIds()).has(id);
}
