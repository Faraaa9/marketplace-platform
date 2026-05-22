const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "@": "a",
  "$": "s",
};

/**
 * Paruošia tekstą blocklist atpažinimui: mažosios raidės, nuimti diakritikai,
 * leetspeak paverstas raidėmis, sutraukti 3+ pasikartojantys simboliai.
 * Naudojama TIK atpažinimui — originalus tekstas saugomas atskirai.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[0134578@$]/g, (c) => LEET_MAP[c] ?? c)
    .replace(/(.)\1{2,}/g, "$1");
}
