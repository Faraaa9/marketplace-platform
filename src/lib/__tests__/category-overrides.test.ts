import assert from "node:assert/strict";
import { pickCategoryOverrideSlug } from "../category-overrides";

// The six small-repair santechnika slugs the override may return, in priority
// order (first present in `validSlugs` wins). Mirrors INDOOR_PLUMBING_REPAIR_SLUGS.
const STATYBOS_SMULKUS =
  "pr-statybos-apdaila--santechnikai-santechnikos-darbai--smulkus-santechnikos-darbai";
const STATYBOS_VAMZDYNAI =
  "pr-statybos-apdaila--santechnikai-santechnikos-darbai--santechnikos-sistemu-vamzdynu-remontas";
const BUITINES_SMULKUS =
  "pr-buitines-paslaugos--santechnikai-santechnikos-darbai--smulkus-santechnikos-darbai";
const STATYBOS_ELEKTRA =
  "pr-statybos-apdaila--elektrikai-elektros-darbai--smulkus-elektros-darbai";

const ALL_SLUGS = new Set([
  STATYBOS_SMULKUS,
  STATYBOS_VAMZDYNAI,
  "pr-statybos-apdaila--santechnikai-santechnikos-darbai--santechnikas-i-namus",
  BUITINES_SMULKUS,
  "pr-buitines-paslaugos--santechnikai-santechnikos-darbai--santechnikos-sistemu-vamzdynu-remontas",
  "pr-buitines-paslaugos--santechnikai-santechnikos-darbai--santechnikas-i-namus",
]);

const tests: Array<[string, () => void]> = [
  [
    "rozečių ir šviestuvų montavimas parenka smulkius elektros darbus",
    () => {
      const slug = pickCategoryOverrideSlug(
        "Reikia sumontuoti šviestuvus ir sutvarkyti dvi neveikiančias rozetes.",
        new Set([STATYBOS_ELEKTRA]),
      );
      assert.equal(slug, STATYBOS_ELEKTRA);
    },
  ],
  [
    "vien paminėtas šviestuvas be darbo signalo elektros taisyklės neįjungia",
    () => {
      const slug = pickCategoryOverrideSlug(
        "Parduodu senovinį šviestuvą.",
        new Set([STATYBOS_ELEKTRA]),
      );
      assert.equal(slug, null);
    },
  ],

  // ── Positive: an indoor fixture + a leak verb, no outdoor-water context ──
  [
    "indoor fixture + leak verb (kriauklė + varva) returns the first valid repair slug",
    () => {
      const slug = pickCategoryOverrideSlug(
        "Varva vanduo po virtuvės kriaukle, reikia sutvarkyti.",
        ALL_SLUGS,
      );
      assert.equal(slug, STATYBOS_SMULKUS);
    },
  ],
  [
    "diacritics are folded: 'Bėga vanduo iš čiaupo' (čiaup + bėga) still triggers",
    () => {
      const slug = pickCategoryOverrideSlug("Bėga vanduo iš čiaupo.", ALL_SLUGS);
      assert.equal(slug, STATYBOS_SMULKUS);
    },
  ],
  [
    "unitazas leaking (unitaz + prateka) triggers",
    () => {
      const slug = pickCategoryOverrideSlug("Prateka unitazas, reikia meistro.", ALL_SLUGS);
      assert.equal(slug, STATYBOS_SMULKUS);
    },
  ],

  // ── Negative: missing one of the two required signals ──
  [
    "fixture without a leak verb returns null (maišytuvo keitimas, no leak)",
    () => {
      const slug = pickCategoryOverrideSlug("Noriu pakeisti virtuvės maišytuvą.", ALL_SLUGS);
      assert.equal(slug, null);
    },
  ],
  [
    "leak verb without an indoor fixture returns null",
    () => {
      const slug = pickCategoryOverrideSlug("Kažkur bėga vanduo, nežinau iš kur.", ALL_SLUGS);
      assert.equal(slug, null);
    },
  ],
  [
    "unrelated text (painting) returns null",
    () => {
      const slug = pickCategoryOverrideSlug("Reikia perdažyti sienas bute.", ALL_SLUGS);
      assert.equal(slug, null);
    },
  ],
  [
    "empty / whitespace text returns null",
    () => {
      assert.equal(pickCategoryOverrideSlug("   ", ALL_SLUGS), null);
    },
  ],

  // ── Outdoor-water suppression: an outdoor signal forces null even with a
  //    fixture + leak present (this is the guard that keeps roof/rain/drainage
  //    work out of the indoor small-repair category). ──
  [
    "outdoor water (lietaus/stogo) suppresses even with kriauklė + bėga present",
    () => {
      const slug = pickCategoryOverrideSlug(
        "Lietaus vanduo bėga nuo stogo, lauko kriauklė užsikimšusi.",
        ALL_SLUGS,
      );
      assert.equal(slug, null);
    },
  ],
  [
    "drainage context (drenažas) suppresses the indoor override",
    () => {
      const slug = pickCategoryOverrideSlug(
        "Reikia drenažo, nes vanduo teka po vonios pamatais.",
        ALL_SLUGS,
      );
      assert.equal(slug, null);
    },
  ],

  // ── validSlugs gating: the override only returns a slug that actually exists ──
  [
    "returns null when none of the repair slugs are valid (taxonomy drift guard)",
    () => {
      const slug = pickCategoryOverrideSlug("Varva vanduo po kriaukle.", new Set<string>());
      assert.equal(slug, null);
    },
  ],
  [
    "falls through to a later valid slug when the earlier ones are absent",
    () => {
      const slug = pickCategoryOverrideSlug(
        "Varva vanduo po kriaukle.",
        new Set([BUITINES_SMULKUS]),
      );
      assert.equal(slug, BUITINES_SMULKUS);
    },
  ],

  // ── PRECISION GAP (characterization — see audit 2026-06-13, finding "vanduo
  //    over-broad"). The leak gate accepts a BARE /\bvanduo\b/ word as a "leak"
  //    signal. Combined with any indoor-fixture word, a request that merely
  //    MENTIONS water (no actual leak) still forces the small-repair santechnika
  //    category to rank #1. This test documents the current (over-eager)
  //    behavior; it is NOT an endorsement. Tightening the leak gate to require a
  //    genuine leak verb (drop bare "vanduo", or require it to co-occur with a
  //    leak verb) would flip this assertion. ──
  [
    "PRECISION GAP: 'vonios' + bare 'vanduo' (no leak verb) still triggers the repair override",
    () => {
      const slug = pickCategoryOverrideSlug(
        "Tvarkau vonios kambarį, vanduo jau atvestas.",
        ALL_SLUGS,
      );
      // Current behavior: fires (vonios = fixture, vanduo = "leak"). Arguably a
      // false positive — this is an installation/finishing request, not a leak.
      assert.equal(slug, STATYBOS_SMULKUS);
    },
  ],
];

(async () => {
  for (const [name, fn] of tests) {
    fn();
    console.log(`ok - ${name}`);
  }
  console.log("RESULT: PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
