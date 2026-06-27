import assert from "node:assert/strict";
import {
  EMPTY_PROVIDER_FILTERS,
  filterAndSortProviders,
  type ProviderCardData,
} from "../provider-filters";

// Minimal card — only the fields the filter reads matter; the rest are stubbed.
function card(over: Partial<ProviderCardData>): ProviderCardData {
  return {
    id: "p",
    slug: "p",
    name: "Provider",
    profileImage: null,
    coverImage: null,
    description: null,
    categories: [],
    categoryMatchSlugs: [],
    location: null,
    isVerified: false,
    isPremium: false,
    isYoungTalent: false,
    isGoat: false,
    badge: null,
    responseCount: 0,
    acceptedCount: 0,
    isRecentlyActive: false,
    presenceLevel: null,
    presenceLabel: null,
    avgRating: null,
    reviewCount: 0,
    hasActiveStory: false,
    availableForUrgent: false,
    priceFrom: null,
    avgResponseTimeHours: null,
    ...over,
  };
}

const tests: Array<[string, () => void]> = [
  [
    "root-slug filter matches a provider tagged only with a leaf category (match-set carries the ancestor)",
    () => {
      const leafProvider = card({
        id: "leaf",
        categories: [{ id: "c1", name: "Elektrikas", slug: "elektrikas" }],
        // built by buildProviderCards: own slug+id plus ancestor root slug
        categoryMatchSlugs: ["elektrikas", "c1", "statybos-apdaila"],
      });
      const other = card({
        id: "other",
        categoryMatchSlugs: ["transportas", "c2"],
      });

      const out = filterAndSortProviders([leafProvider, other], {
        ...EMPTY_PROVIDER_FILTERS,
        categories: ["statybos-apdaila"],
      });

      assert.equal(out.length, 1);
      assert.equal(out[0].id, "leaf");
    },
  ],
  [
    "leaf-slug filter still matches directly",
    () => {
      const p = card({ categoryMatchSlugs: ["elektrikas", "c1", "statybos-apdaila"] });
      const out = filterAndSortProviders([p], {
        ...EMPTY_PROVIDER_FILTERS,
        categories: ["elektrikas"],
      });
      assert.equal(out.length, 1);
    },
  ],
  [
    "unrelated category filters the provider out",
    () => {
      const p = card({ categoryMatchSlugs: ["elektrikas", "statybos-apdaila"] });
      const out = filterAndSortProviders([p], {
        ...EMPTY_PROVIDER_FILTERS,
        categories: ["transportas"],
      });
      assert.equal(out.length, 0);
    },
  ],
];

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL - ${name}`);
    console.error(err);
  }
}
if (failed > 0) {
  console.error(`\n${failed} test(s) failed`);
  process.exit(1);
}
console.log(`\n${tests.length} test(s) passed`);
