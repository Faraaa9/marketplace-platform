const INDOOR_PLUMBING_REPAIR_SLUGS = [
  "pr-statybos-apdaila--santechnikai-santechnikos-darbai--smulkus-santechnikos-darbai",
  "pr-statybos-apdaila--santechnikai-santechnikos-darbai--santechnikos-sistemu-vamzdynu-remontas",
  "pr-statybos-apdaila--santechnikai-santechnikos-darbai--santechnikas-i-namus",
  "pr-buitines-paslaugos--santechnikai-santechnikos-darbai--smulkus-santechnikos-darbai",
  "pr-buitines-paslaugos--santechnikai-santechnikos-darbai--santechnikos-sistemu-vamzdynu-remontas",
  "pr-buitines-paslaugos--santechnikai-santechnikos-darbai--santechnikas-i-namus",
];

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

export function pickCategoryOverrideSlug(
  text: string,
  validSlugs: Set<string>,
): string | null {
  const normalized = normalize(text);
  if (!normalized) return null;

  const outdoorWater = hasAny(normalized, [
    /\blietaus\b/,
    /\bstogo\b/,
    /\blauko\b/,
    /\bdrenaz/,
    /\bnuoteku valymo\b/,
    /\bnuoteku tinkl/,
    /\blietaus nuotek/,
    /\blietaus nuved/,
  ]);
  if (outdoorWater) return null;

  const indoorFixture = hasAny(normalized, [
    /\bkriaukl/,
    /\bciaup/,
    /\bmaisytuv/,
    /\bsifon/,
    /\bunitaz/,
    /\bklozet/,
    /\bvonios\b/,
    /\bduse\b/,
    /\bdusas\b/,
    /\bpo kriaukl/,
  ]);
  const leak = hasAny(normalized, [
    /\bbega\b/,
    /\bleidzia\b/,
    /\bvarva\b/,
    /\bteka\b/,
    /\bprateka\b/,
    /\bnuotekis\b/,
    /\bvanduo\b/,
  ]);

  if (!indoorFixture || !leak) return null;

  return INDOOR_PLUMBING_REPAIR_SLUGS.find((slug) => validSlugs.has(slug)) ?? null;
}
