import assert from "node:assert/strict";
import {
  filterRequestCategoryChoices,
  buildDomainIndex,
  inferRequestRoots,
  type CategorySelectionCandidate,
  type DomainIndexCategory,
} from "../category-selection-rules";

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

  // --- DATA-DRIVEN taxonomy domain signal (Gap 4). A confident dominant root
  // recovers same-root candidates the literal-evidence path misses, while staying
  // conservative: it abstains on sparse/ambiguous requests. ---
];

// Mini two-root taxonomy for the data-driven domain tests.
const taxonomy: DomainIndexCategory[] = [
  { id: "verslui", name: "Paslaugos verslui", rootId: null },
  { id: "v1", name: "Buhalterinė apskaita", rootId: "verslui" },
  { id: "v2", name: "Mokesčių konsultacijos", rootId: "verslui" },
  { id: "v3", name: "Metinių ataskaitų rengimas", rootId: "verslui" },
  { id: "v4", name: "Finansinis auditas", rootId: "verslui" },
  { id: "statyba", name: "Statybos, apdaila", rootId: null },
  { id: "s1", name: "Plytelių klijavimas", rootId: "statyba" },
  { id: "s2", name: "Elektros instaliacija", rootId: "statyba" },
];

const businessCandidate: CategorySelectionCandidate = {
  id: "v4",
  slug: "finansinis-auditas",
  name: "Finansinis auditas",
  depth: 2,
  parentId: "verslui",
  rootId: "verslui",
};

tests.push(
  [
    "data-driven: a confident root keeps a same-root candidate with no literal name hit",
    () => {
      const index = buildDomainIndex(taxonomy);
      // Note: the request never says "auditas" or "finansinis".
      const text = "Reikia buhalterinės apskaitos ir mokesčių konsultacijos įmonei.";
      const signal = inferRequestRoots(text, index);
      assert.equal(signal.dominantRoot, "verslui", "request should confidently map to the business root");

      // Baseline (no signal): no literal name evidence → dropped.
      assert.deepEqual(
        filterRequestCategoryChoices([businessCandidate], text, (item) => item).map((c) => c.slug),
        [],
      );
      // With the confident root signal → recovered.
      assert.deepEqual(
        filterRequestCategoryChoices([businessCandidate], text, (item) => item, signal).map((c) => c.slug),
        ["finansinis-auditas"],
      );
    },
  ],
  [
    "data-driven: a sparse request abstains — no over-accept of a same-root candidate",
    () => {
      const index = buildDomainIndex(taxonomy);
      // A single distinctive token that does NOT literally name the candidate
      // ("buhalterio" ≠ "Finansinis auditas").
      const text = "Reikia buhalterio.";
      const signal = inferRequestRoots(text, index);
      assert.equal(signal.dominantRoot, null, "one token must not be enough to declare a root");
      // dominantRoot null → behaves like baseline → no name hit → dropped.
      assert.deepEqual(
        filterRequestCategoryChoices([businessCandidate], text, (item) => item, signal).map((c) => c.slug),
        [],
      );
    },
  ],
  [
    "data-driven: buildDomainIndex keeps distinctive stems and drops generic ones",
    () => {
      const index = buildDomainIndex(taxonomy);
      assert.ok(index.tokenToRoots.get("buhal")?.has("verslui"), "distinctive stem maps to its root");
      assert.equal(index.tokenToRoots.has("pasla"), false, "'paslaugos' is generic and must be excluded");
    },
  ],
  [
    "data-driven: inferRequestRoots needs a clear margin to declare a dominant root",
    () => {
      const index = buildDomainIndex(taxonomy);
      // One business + one construction token → tie, insufficient margin → abstain.
      assert.equal(inferRequestRoots("buhalterinė plytelių", index).dominantRoot, null);
      // Two clear business tokens → confident.
      assert.equal(
        inferRequestRoots("buhalterinė apskaita mokesčių konsultacijos", index).dominantRoot,
        "verslui",
      );
    },
  ],
);

// --- PRECISION: cross-domain false-positive leaks must NOT survive (regressions
// from the production smoke test, 2026-06-09), while genuine matches still do. ---
tests.push(
  [
    "precision: 'Virusų valymas' (IT) does not leak into a generic cleaning request",
    () => {
      const picked = filterRequestCategoryChoices(
        [
          cat("virusu-valymas", "Virusų valymas", "it"),
          cat("stogu-valymas", "Stogų valymas", "statyba"),
        ],
        "biuro valymas kas savaitę",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), [], "no specific cleaning leaf should match a bare 'valymas'");
    },
  ],
  [
    "precision: a specifically-named cleaning category still matches its own request",
    () => {
      const picked = filterRequestCategoryChoices(
        [cat("langu-valymas", "Langų valymas", "valymas")],
        "Reikia langų valymo bute.",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["langu-valymas"]);
    },
  ],
  [
    "precision: ceiling work does not leak into 'baidarės perdažymas' (5-char stem collision)",
    () => {
      const picked = filterRequestCategoryChoices(
        [
          cat("perdangos-siltinimas", "Perdangos šiltinimas", "statyba"),
          cat("perdangu-betonavimas", "Perdangų betonavimas", "statyba"),
        ],
        "baidarės perdažymas",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), [], "'perda' stem must not bridge perdažymas↔perdangos");
    },
  ],
  [
    "precision: an exact/declension-named repaint category still matches 'baidarės perdažymas'",
    () => {
      const picked = filterRequestCategoryChoices(
        [cat("baidariu-perdazymas", "Baidarių perdažymas", "sportas")],
        "baidarės perdažymas",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["baidariu-perdazymas"]);
    },
  ],
  [
    "precision: 'Elektros instaliacija' still matches 'elektriko' (≥6 prefix keeps declension)",
    () => {
      const picked = filterRequestCategoryChoices(
        [cat("elektros-instaliacija", "Elektros instaliacija", "statyba")],
        "ieškau elektriko Kaune",
        (item) => item,
      );
      assert.deepEqual(picked.map((item) => item.slug), ["elektros-instaliacija"]);
    },
  ],
);

(async () => {
  for (const [name, fn] of tests) {
    fn();
    console.log(`ok - ${name}`);
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
