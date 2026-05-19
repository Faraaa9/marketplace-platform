import type { PrismaClient } from "@prisma/client";

const LT_DIACRITICS: Record<string, string> = {
  ą: "a",
  č: "c",
  ę: "e",
  ė: "e",
  į: "i",
  š: "s",
  ų: "u",
  ū: "u",
  ž: "z",
};

/**
 * Convert any string (typically a Lithuanian person/business name) into a
 * URL-safe slug. Handles LT diacritics explicitly because Unicode NFD
 * decomposition does NOT split characters like `ė` or `ų` into base+mark
 * pairs, so the generic accent strip would leave them untouched.
 */
export function slugify(text: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .replace(/[ąčęėįšųūž]/g, (ch) => LT_DIACRITICS[ch] ?? ch)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Prisma cuid v1: 25 chars, starts with "c" followed by 24 lowercase
 * alphanumeric chars. We use this to detect legacy `/tiekejai/[id]` URLs and
 * redirect to the slug version.
 */
export function isCuid(value: string): boolean {
  return /^c[a-z0-9]{24,}$/.test(value);
}

/**
 * Generate a slug that's unique across `provider_profiles.slug`. Falls back
 * to a userId-derived suffix on collision. The fallback is deterministic so
 * the same user always gets the same slug if name collisions happen.
 */
export async function generateUniqueProviderSlug(
  prisma: PrismaClient,
  name: string | null | undefined,
  fallbackUserId: string,
): Promise<string> {
  const baseRaw = slugify(name || "");
  const base = baseRaw || "tiekejas";

  const existing = await prisma.providerProfile.findUnique({
    where: { slug: base },
    select: { id: true },
  });
  if (!existing) return base;

  const suffix = fallbackUserId.slice(0, 6).toLowerCase();
  const withSuffix = `${base}-${suffix}`.slice(0, 80);

  const stillTaken = await prisma.providerProfile.findUnique({
    where: { slug: withSuffix },
    select: { id: true },
  });
  if (!stillTaken) return withSuffix;

  // Extremely unlikely third collision — use full userId tail.
  const longSuffix = fallbackUserId.slice(-10).toLowerCase();
  return `${base}-${longSuffix}`.slice(0, 80);
}
