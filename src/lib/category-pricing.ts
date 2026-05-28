/**
 * Category visibility pricing — client-safe constants (no DB imports), so both
 * the server credit logic and client editor UI can share them.
 *
 * A provider gets up to FREE_CATEGORY_LIMIT permanent base categories for free.
 * Beyond that, each extra category is unlocked for a chosen number of 30-day
 * periods, costing CREDITS_PER_CATEGORY_MONTH per period.
 */
export const FREE_CATEGORY_LIMIT = 4;
export const CREDITS_PER_CATEGORY_MONTH = 2;
export const CATEGORY_PERIOD_DAYS = 30;
export const MAX_CATEGORY_MONTHS = 12;
