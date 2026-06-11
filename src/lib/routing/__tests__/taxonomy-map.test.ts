/**
 * Unit tests for the taxonomy name → Category.id mapper (Phase 2 prep).
 * Locks the documented lookup order (name → slug → externalSlug → alias),
 * diacritic folding, first-writer-wins determinism, and the unmatched-name
 * (taxonomy drift) path. Deterministic, no DB, no network.
 *
 * Run:  pnpm test:taxonomy-map
 */
import assert from "node:assert/strict";
import {
  buildCategoryNameIndex,
  mapNameToCategoryId,
  mapNamesToCategoryIds,
  namesForIds,
  type CategoryAliasLite,
  type CategoryLite,
} from "../taxonomy-map";

let failures = 0;
function t(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failures += 1;
    console.error(`  ✗ ${name}\n      ${(e as Error).message}`);
  }
}

const CATS: CategoryLite[] = [
  { id: "cat_elektra", name: "Elektrikai, elektros darbai", slug: "elektrikai" },
  { id: "cat_siuksles", name: "Šiukšlių išvežimas: statybinių ir kt.", slug: "siuksliu-isvezimas" },
  // slug collides with cat_elektra's NAME-ish token to prove name wins over slug
  { id: "cat_kita", name: "Kiti darbai", slug: "elektrikai, elektros darbai" },
  { id: "cat_ext", name: "Apdaila X", slug: "apdaila-x", externalSlug: "bendri-apdailos-darbai" },
];

const ALIASES: CategoryAliasLite[] = [
  { categoryId: "cat_elektra", aliasName: "Elektros montavimo darbai", aliasSlug: "elektros-montavimas" },
  // alias deliberately shadows cat_ext's externalSlug — externalSlug must win
  { categoryId: "cat_kita", aliasName: "bendri-apdailos-darbai" },
];

console.log("taxonomy-map — index construction");

t("index resolves canonical name, slug, and externalSlug (folded)", () => {
  const idx = buildCategoryNameIndex(CATS, ALIASES);
  assert.equal(mapNameToCategoryId(idx, "Elektrikai, elektros darbai"), "cat_elektra");
  assert.equal(mapNameToCategoryId(idx, "siuksliu-isvezimas"), "cat_siuksles");
  assert.equal(mapNameToCategoryId(idx, "bendri-apdailos-darbai"), "cat_ext");
});

t("diacritic + case variants resolve to the same category", () => {
  const idx = buildCategoryNameIndex(CATS, ALIASES);
  assert.equal(mapNameToCategoryId(idx, "ŠIUKŠLIŲ IŠVEŽIMAS: STATYBINIŲ IR KT."), "cat_siuksles");
  assert.equal(mapNameToCategoryId(idx, "siuksliu isvezimas: statybiniu ir kt."), "cat_siuksles");
});

t("first writer wins on duplicate folded names (deterministic)", () => {
  const idx = buildCategoryNameIndex([
    { id: "cat_first", name: "Plytelių klijavimas", slug: "plyteles-1" },
    { id: "cat_dup", name: "PLYTELIU KLIJAVIMAS", slug: "plyteles-2" },
  ]);
  assert.equal(mapNameToCategoryId(idx, "Plytelių klijavimas"), "cat_first");
});

t("categories without id are skipped without crashing", () => {
  const idx = buildCategoryNameIndex([
    { id: "", name: "Tuščia", slug: "tuscia" },
    { id: "cat_ok", name: "Gerai", slug: "gerai" },
  ]);
  assert.equal(mapNameToCategoryId(idx, "Tuščia"), null);
  assert.equal(mapNameToCategoryId(idx, "Gerai"), "cat_ok");
});

console.log("\ntaxonomy-map — lookup precedence (name → slug → externalSlug → alias)");

t("canonical NAME beats another category's identical slug", () => {
  const idx = buildCategoryNameIndex(CATS, ALIASES);
  // "elektrikai, elektros darbai" is cat_elektra's name AND cat_kita's slug
  assert.equal(mapNameToCategoryId(idx, "Elektrikai, elektros darbai"), "cat_elektra");
});

t("externalSlug beats an alias with the same key", () => {
  const idx = buildCategoryNameIndex(CATS, ALIASES);
  assert.equal(mapNameToCategoryId(idx, "bendri-apdailos-darbai"), "cat_ext");
});

t("alias name and alias slug resolve when nothing earlier matches", () => {
  const idx = buildCategoryNameIndex(CATS, ALIASES);
  assert.equal(mapNameToCategoryId(idx, "Elektros montavimo darbai"), "cat_elektra");
  assert.equal(mapNameToCategoryId(idx, "elektros-montavimas"), "cat_elektra");
});

t("empty and unknown names return null, never throw", () => {
  const idx = buildCategoryNameIndex(CATS, ALIASES);
  assert.equal(mapNameToCategoryId(idx, ""), null);
  assert.equal(mapNameToCategoryId(idx, "   "), null);
  assert.equal(mapNameToCategoryId(idx, "Tokio nėra"), null);
});

console.log("\ntaxonomy-map — batch mapping (drift path)");

t("mapNamesToCategoryIds keeps order, dedups ids, collects unmatched", () => {
  const idx = buildCategoryNameIndex(CATS, ALIASES);
  const r = mapNamesToCategoryIds(idx, [
    "Elektrikai, elektros darbai",
    "Elektros montavimo darbai", // alias → same cat_elektra → deduped in matchedIds
    "Lietaus nuvedimo sistemos", // taxonomy drift: not in marketplace
    "Šiukšlių išvežimas: statybinių ir kt.",
  ]);
  assert.deepEqual(r.matchedIds, ["cat_elektra", "cat_siuksles"]);
  assert.equal(r.matched.length, 3, "both elektra spellings stay in matched[]");
  assert.deepEqual(r.unmatched, ["Lietaus nuvedimo sistemos"]);
});

t("namesForIds resolves known ids and silently skips unknown ones", () => {
  const idx = buildCategoryNameIndex(CATS, ALIASES);
  assert.deepEqual(namesForIds(idx, ["cat_siuksles", "cat_nezinomas", "cat_elektra"]), [
    "Šiukšlių išvežimas: statybinių ir kt.",
    "Elektrikai, elektros darbai",
  ]);
});

console.log(failures === 0 ? "\nRESULT: PASS" : `\nRESULT: FAIL — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
