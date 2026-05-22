/**
 * phase3-category-map.js
 *
 * Phase 3: maps the 12 legacy SERVICE_CATEGORIES codes (src/lib/constants.ts)
 * onto the curated Category tree. Shared by the Phase 3 backfill scripts.
 *
 * Resolution:
 *   - kind "category" -> a depth-1 curated category, matched by `name`
 *     within pageType="service" rows.
 *   - kind "root"     -> a curated root, matched by `slug` (rootSlug). The 3
 *     coarse codes have no single curated category, so they map to a root;
 *     matching is tree-aware (a root covers the categories under it).
 *   - null            -> no curated category; ServiceRequest.categoryId stays
 *     null and no ProviderProfileCategory row is created (legacy "kita").
 */

const MAP = {
  santechnika: { kind: "category", name: "Santechnikos darbai" },
  elektra: { kind: "category", name: "Elektros darbai" },
  transportas: { kind: "category", name: "Perkraustymas ir transportas" },
  it: { kind: "category", name: "Programavimas ir IT paslaugos" },
  teise: { kind: "category", name: "Teisinės paslaugos" },
  buhalterija: { kind: "category", name: "Buhalterija ir apskaita" },
  statyba: { kind: "root", rootSlug: "statyba-apdaila-remontas" },
  valymas: { kind: "root", rootSlug: "valymo-paslaugos" },
  sodas: { kind: "root", rootSlug: "aplinka-sodas" },
  dizainas: { kind: "category", name: "Interjero dizainas" },
  svietimas: { kind: "category", name: "Kiti kursai ir mokymai" },
  kita: null,
};

/**
 * Resolve every mapped target to a Category row against the DB.
 * Returns { resolved: Map<code, {categoryId,label,kind}|null>, errors: string[] }.
 * `errors` is non-empty if any non-null target failed to resolve.
 */
async function resolveCategoryMap(prisma) {
  const resolved = new Map();
  const errors = [];
  for (const [code, target] of Object.entries(MAP)) {
    if (target === null) {
      resolved.set(code, null);
      continue;
    }
    let row;
    if (target.kind === "root") {
      row = await prisma.category.findUnique({
        where: { slug: target.rootSlug },
        select: { id: true, name: true },
      });
    } else {
      row = await prisma.category.findFirst({
        where: { name: target.name, pageType: "service" },
        select: { id: true, name: true },
      });
    }
    if (!row) {
      errors.push(`${code} -> unresolved ${target.kind} "${target.name || target.rootSlug}"`);
      continue;
    }
    resolved.set(code, { categoryId: row.id, label: row.name, kind: target.kind });
  }
  return { resolved, errors };
}

module.exports = { MAP, resolveCategoryMap };
