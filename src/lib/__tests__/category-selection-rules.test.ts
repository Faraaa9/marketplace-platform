import assert from "node:assert/strict";
import { filterRequestCategoryChoices, type CategorySelectionCandidate } from "../category-selection-rules";

function cat(
  slug: string,
  name: string,
  parentId: string | null = null,
  id = slug,
): CategorySelectionCandidate {
  return { id, slug, name, depth: parentId ? 2 : 1, parentId, rootId: "root" };
}

const tests: Array<[string, () => void]> = [
  [
    "leaking kitchen sink maps to plumbing and blocks kitchen furniture",
    () => {
      const picked = filterRequestCategoryChoices(
        [
          cat("smulkus-santechnikos-darbai", "Smulkūs santechnikos darbai", "santechnika"),
          cat("virtuves-baldu-gamyba", "Virtuvės baldų gamyba", "baldai"),
          cat("virtuves-baldu-projektavimas", "Virtuvės baldų projektavimas", "baldai"),
        ],
        "Varva vanduo po virtuvės kriaukle. Reikia sutvarkyti Kaune šiandien arba rytoj.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["smulkus-santechnikos-darbai"]);
    },
  ],
  [
    "plytelių klijavimas vonioje does not become full bathroom repair",
    () => {
      const picked = filterRequestCategoryChoices(
        [
          cat("plyteliu-klijavimas", "Plytelių klijavimas", "apdaila"),
          cat("vonios-remontas", "Vonios remontas", "apdaila"),
          cat("plyteliu-demontavimas", "Plytelių demontavimas", "griovimas"),
        ],
        "Reikia išklijuoti plyteles vonioje.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["plyteliu-klijavimas"]);
    },
  ],
  [
    "terrace building does not include oiling or glazing",
    () => {
      const picked = filterRequestCategoryChoices(
        [
          cat("terasu-irengimas", "Terasų įrengimas", "medis"),
          cat("terasos-alyvavimas", "Terasos alyvavimas", "medis"),
          cat("terasu-stiklinimas", "Terasų stiklinimas", "langai"),
        ],
        "Ieškau dailidės pagaminti 20 kv. metrų ąžuolinę terasą.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["terasu-irengimas"]);
    },
  ],
  [
    "generic system words do not match irrigation or solar projects",
    () => {
      const picked = filterRequestCategoryChoices(
        [
          cat("telefonspyniu-montavimas", "Telefonspynių montavimas", "apsauga"),
          cat("laistymo-sistemos-irengimas", "Laistymo sistemos, įrengimas", "aplinka"),
          cat("saules-elektriniu-montavimas", "Saulės elektrinių montavimas", "elektra"),
        ],
        "Reikia išmaniosios telefonspynės, durų skambučio su kamera ir ekrano viduje.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["telefonspyniu-montavimas"]);
    },
  ],
  [
    "parent category is removed when a concrete child is present",
    () => {
      const parent = cat("elektrikai-elektros-darbai", "Elektrikai, elektros darbai", null, "parent");
      const child = cat("smulkus-elektros-darbai", "Smulkūs elektros darbai", "parent", "child");
      const picked = filterRequestCategoryChoices(
        [child, parent],
        "Reikia elektriko rozetėms ir jungikliams bute.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["smulkus-elektros-darbai"]);
    },
  ],
];

(async () => {
  for (const [name, fn] of tests) {
    fn();
    console.log(`ok - ${name}`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
