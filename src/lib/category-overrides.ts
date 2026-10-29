const INDOOR_PLUMBING_REPAIR_SLUGS = [
  "pr-statybos-apdaila--santechnikai-santechnikos-darbai--smulkus-santechnikos-darbai",
  "pr-statybos-apdaila--santechnikai-santechnikos-darbai--santechnikos-sistemu-vamzdynu-remontas",
  "pr-statybos-apdaila--santechnikai-santechnikos-darbai--santechnikas-i-namus",
  "pr-buitines-paslaugos--santechnikai-santechnikos-darbai--smulkus-santechnikos-darbai",
  "pr-buitines-paslaugos--santechnikai-santechnikos-darbai--santechnikos-sistemu-vamzdynu-remontas",
  "pr-buitines-paslaugos--santechnikai-santechnikos-darbai--santechnikas-i-namus",
];

const SMALL_ELECTRICAL_WORK_SLUGS = [
  "pr-statybos-apdaila--elektrikai-elektros-darbai--smulkus-elektros-darbai",
  "pr-buitines-paslaugos--meistrai-i-namus--smulkus-elektros-darbai",
  "pr-statybos-apdaila--elektrikai-elektros-darbai--elektros-instaliacija",
  "elektros-darbai",
];

// Existing "Buitinės paslaugos > Valymo paslaugos" leaves for business cleaning.
// They already exist in the taxonomy; the gap is purely routing — "biuro valymas"
// (sing.) never reaches "Biurų valymas" (plur., 4-char root "biur") and "valymas"
// is a generic token, so the request used to fall back to an unrelated cleaning
// leaf (roof cleaning). These map the common phrasings to the right category.
const OFFICE_CLEANING_SLUG =
  "pr-buitines-paslaugos--valymo-paslaugos--biuru-valymas";
const COMMERCIAL_PREMISES_CLEANING_SLUG =
  "pr-buitines-paslaugos--valymo-paslaugos--komerciniu-patalpu-valymas";

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

  const electricalFixture = hasAny(normalized, [
    /\brozet/,
    /\bjungikl/,
    /\belektros lizd/,
    /\bsviestuv/,
    /\blamp/,
  ]);
  const electricalWork = hasAny(normalized, [
    /\belektrik/,
    /\belektros\b/,
    /\bneveikia\b/,
    /\bmontu/,
    /\bpajung/,
    /\bsutvark/,
    /\bkeist/,
  ]);
  if (electricalFixture && electricalWork) {
    return SMALL_ELECTRICAL_WORK_SLUGS.find((slug) => validSlugs.has(slug)) ?? null;
  }

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

  // Business-premises cleaning. Only fires on an explicit cleaning verb, so it
  // never hijacks "biuro baldų gamyba" (no cleaning word) or "stogo valymas"
  // (returned null above as outdoor). Commercial/administrative premises take
  // precedence over the plain office leaf.
  const isCleaning = hasAny(normalized, [/\bvalym/, /\btvarkym/]);
  if (isCleaning) {
    const commercialPremises = hasAny(normalized, [/\bkomercin/, /\badministracin/]);
    if (commercialPremises && validSlugs.has(COMMERCIAL_PREMISES_CLEANING_SLUG)) {
      return COMMERCIAL_PREMISES_CLEANING_SLUG;
    }
    const office = hasAny(normalized, [/\bbiur/, /\bofis/]);
    if (office && validSlugs.has(OFFICE_CLEANING_SLUG)) {
      return OFFICE_CLEANING_SLUG;
    }
  }

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
