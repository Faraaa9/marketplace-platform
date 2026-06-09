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

  // --- RECALL cases: legitimate categories must SURVIVE. Each of these was a
  // false-negative before the prefix-tolerance + evidence-ordering fixes. ---

  [
    "recall: balcony glazing survives the prefixed verb 'įstiklinti' (not just the noun)",
    () => {
      const picked = filterRequestCategoryChoices(
        [
          cat("balkonu-stiklinimas", "Balkonų stiklinimas", "langai"),
          cat("kompiuteriu-remontas", "Kompiuterių remontas", "it"),
        ],
        "Norėčiau įstiklinti balkoną bute.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["balkonu-stiklinimas"]);
    },
  ],
  [
    "recall: a literally-named cleaning category survives a plumbing-flavoured request",
    () => {
      const picked = filterRequestCategoryChoices(
        [
          cat("smulkus-santechnikos-darbai", "Smulkūs santechnikos darbai", "santechnika"),
          cat("patalpu-valymas", "Patalpų valymas", "valymas"),
        ],
        "Bute trūko vamzdis, reikia santechniko ir patalpų valymo po avarijos.",
        (item) => item,
      );
      assert.ok(
        picked.some((item) => item.slug === "patalpu-valymas"),
        "Patalpų valymas should survive on literal name evidence, not be dropped as off-domain",
      );
    },
  ],
  [
    "recall: 'Vandentiekio įrengimas' survives a plumbing request (candidate-domain gap)",
    () => {
      const picked = filterRequestCategoryChoices(
        [cat("vandentiekio-irengimas", "Vandentiekio įrengimas", "santechnika")],
        "Reikia pakeisti vamzdžius ir įvesti vandentiekį naujame bute.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["vandentiekio-irengimas"]);
    },
  ],
  [
    "recall: 'Interjero projektavimas' survives when the user says 'dizaineris'",
    () => {
      const picked = filterRequestCategoryChoices(
        [cat("interjero-projektavimas", "Interjero projektavimas", "dizainas")],
        "Ieškau interjero dizainerio idėjoms ir vizualizacijoms.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["interjero-projektavimas"]);
    },
  ],
  [
    "recall: 'Langų plovimas' survives the verb 'nuvalyti' (prefix + cleaning synonym)",
    () => {
      const picked = filterRequestCategoryChoices(
        [cat("langu-plovimas", "Langų plovimas", "valymas")],
        "Reikia nuvalyti langus name po remonto.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["langu-plovimas"]);
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
