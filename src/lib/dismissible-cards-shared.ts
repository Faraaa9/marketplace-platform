// Pure helpers shared by the server reader (next/headers) and the client writer
// (document.cookie). No framework imports here so both sides can use it.
//
// Dismissed card ids live in a single cookie as a `~`-separated list. Ids are
// kebab-case slugs ([a-z0-9-]), so `~` never collides and the value needs no
// URL-encoding (both `~` and `-` are valid cookie-value characters).

export const DISMISSED_CARDS_COOKIE = "dismissed_cards";
export const DISMISSED_CARDS_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const SEPARATOR = "~";

export function parseDismissedCards(raw: string | undefined | null): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(SEPARATOR)
      .map((id) => id.trim())
      .filter(Boolean),
  );
}

export function serializeDismissedCards(ids: Iterable<string>): string {
  return Array.from(new Set(ids))
    .map((id) => id.trim())
    .filter(Boolean)
    .join(SEPARATOR);
}
