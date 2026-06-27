/**
 * Category visibility pricing — client-safe constants (no DB imports), so both
 * the server credit logic and client editor UI can share them.
 *
 * A provider gets up to FREE_CATEGORY_LIMIT permanent base categories for free.
 * Beyond that, each extra category is unlocked for a chosen number of 30-day
 * periods, costing CREDITS_PER_CATEGORY_MONTH per period.
 */
// ponytail: 10 = dosni, bet finišuota riba per cold-start (padengia bet kurį
// realų meistrą, blokuoja "susidėjau viską" spam). Anti-spam realiai sprendžia
// relevance rikiavimas (Stadija 2, kai bus pasiūlos perteklius), ne ši riba.
// Grąžinti link 4-6 jei kada prireiks griežtesnio filtro perpildytuose segmentuose.
export const FREE_CATEGORY_LIMIT = 10;
export const CREDITS_PER_CATEGORY_MONTH = 2;
export const CATEGORY_PERIOD_DAYS = 30;
export const MAX_CATEGORY_MONTHS = 12;
