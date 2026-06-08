/**
 * Shadow-routing smoke test — multi-routing v4 (Phase 1).
 *
 * Runs the REAL ported v4 classifier + taxonomy mapper against a fixture
 * taxonomy and 5 sample requests, printing OLD (current) categories vs the v4
 * shadow routing. Self-contained + deterministic: no DB, no network, no LLM —
 * so it is safe to run anywhere and never touches production data.
 *
 * Run:  pnpm shadow:smoke
 * (mirrors the repo's other ts-node scripts; deterministic exit 0/1.)
 */

import assert from "node:assert/strict";
import {
  classifyMultiRouting,
  type MultiRoutingResult,
} from "../src/lib/routing/multi-routing-v4";
import {
  buildCategoryNameIndex,
  mapNameToCategoryId,
  mapNamesToCategoryIds,
  namesForIds,
  type CategoryLite,
  type CategoryAliasLite,
} from "../src/lib/routing/taxonomy-map";

// ── Fixture taxonomy (stable ids; subset of the real paslaugurinka taxonomy) ──
// NOTE: "Lietaus nuvedimo sistemos" is deliberately absent so sample 4 exercises
// the unmatched / taxonomy-drift path (audit R1) without crashing.
const TAXONOMY: CategoryLite[] = [
  { id: "cat_elektrikai", name: "Elektrikai, elektros darbai", slug: "elektrikai-elektros-darbai" },
  { id: "cat_santechnika", name: "Santechnikai, santechnikos darbai", slug: "santechnikai-santechnikos-darbai" },
  { id: "cat_vidaus", name: "Vidaus apdailos darbai", slug: "vidaus-apdailos-darbai" },
  { id: "cat_plyteles", name: "Plytelių klijavimas", slug: "plyteliu-klijavimas" },
  { id: "cat_stogai", name: "Stogdengiai, stogo darbai", slug: "stogdengiai-stogo-darbai" },
  { id: "cat_statybos", name: "Statybos darbai", slug: "statybos-darbai" },
  { id: "cat_griovimas", name: "Griovimo darbai", slug: "griovimo-darbai" },
  { id: "cat_siuksles", name: "Šiukšlių išvežimas: statybinių ir kt.", slug: "siuksliu-isvezimas-statybiniu" },
];

const ALIASES: CategoryAliasLite[] = [
  { categoryId: "cat_elektrikai", aliasName: "Elektrikas", aliasSlug: "elektrikas" },
];

interface Sample {
  id: string;
  title: string;
  description: string;
  city: string;
  /** The request's already-curated categories (names), in priority order. */
  oldCategories: string[];
  note: string;
}

const SAMPLES: Sample[] = [
  {
    id: "req_1",
    title: "Vonios kambario remontas",
    description:
      "Reikia perkloti plyteles (klijavimas), atnaujinti santechnikos mazgus ir sienų apdailos darbai.",
    city: "Vilnius",
    oldCategories: [
      "Santechnikai, santechnikos darbai",
      "Plytelių klijavimas",
      "Vidaus apdailos darbai",
    ],
    note: "multi-category kept as-is (no suppressible catch-all present)",
  },
  {
    id: "req_2",
    title: "Pilna namo renovacija po raktu",
    description:
      "Namo renovacija po raktu: elektros instaliacija, vandentiekis, apdaila. Reikia rangovo.",
    city: "Kaunas",
    oldCategories: [
      "Statybos darbai",
      "Elektrikai, elektros darbai",
      "Santechnikai, santechnikos darbai",
    ],
    note: "catch-all 'Statybos darbai' suppressed (no text evidence) + project_type",
  },
  {
    id: "req_3",
    title: "Elektros instaliacija bute",
    description: "Reikia pakeisti elektros instaliaciją dviejų kambarių bute.",
    city: "Klaipėda",
    oldCategories: ["Elektrikai, elektros darbai"],
    note: "single category — no multi-specialist tag",
  },
  {
    id: "req_4",
    title: "Stogo remontas ir lietaus sistema",
    description: "Reikia suremontuoti šlaitinį stogą ir sutvarkyti lietaus nuvedimą.",
    city: "Vilnius",
    oldCategories: ["Stogdengiai, stogo darbai", "Lietaus nuvedimo sistemos"],
    note: "taxonomy drift: 'Lietaus nuvedimo sistemos' has no Category → unmatched (logged, no crash)",
  },
  {
    id: "req_5",
    title: "Pastato griovimas",
    description: "Reikia nugriauti seną mūrinį garažą ir išvalyti sklypą.",
    city: "Šiauliai",
    oldCategories: ["Šiukšlių išvežimas: statybinių ir kt.", "Griovimo darbai"],
    note: "catch-all 'Šiukšlių išvežimas' suppressed → routing shrinks to 1 specific trade",
  },
];

function fmtCats(names: string[], idOf: (n: string) => string | null): string {
  if (names.length === 0) return "(none)";
  return names.map((n) => `${n} [${idOf(n) ?? "—"}]`).join(", ");
}

function main(): number {
  const index = buildCategoryNameIndex(TAXONOMY, ALIASES);
  const idOf = (n: string) => mapNameToCategoryId(index, n);

  let failures = 0;
  const check = (cond: boolean, msg: string) => {
    if (!cond) {
      failures += 1;
      console.error(`   ✗ ASSERT FAILED: ${msg}`);
    }
  };

  console.log("══════════════════════════════════════════════════════════════════");
  console.log(" Shadow routing smoke — multi-routing v4 (Phase 1) — old vs v4");
  console.log("══════════════════════════════════════════════════════════════════");

  for (const s of SAMPLES) {
    // OLD snapshot (what production stores today): primary = first, then ids.
    const oldMapped = mapNamesToCategoryIds(index, s.oldCategories);
    const oldPrimaryName = s.oldCategories[0] ?? null;
    const oldPrimaryId = oldPrimaryName ? idOf(oldPrimaryName) : null;

    // V4 shadow (Phase A2): candidates carry {categoryId, categoryName}; v4 keeps
    // each survivor's ORIGINAL id — no name→id remap.
    const candidates = s.oldCategories.map((name) => ({
      categoryId: idOf(name) ?? `(no-id:${name})`,
      categoryName: name,
    }));
    const v4: MultiRoutingResult = classifyMultiRouting({
      title: s.title,
      description: s.description,
      candidates,
      status: "OPEN",
    });
    const v4Names = v4.routingCategories.map((c) => c.categoryName);
    const v4Ids = v4.routingCategories.map((c) => c.categoryId);

    const suppressed = s.oldCategories.filter((c) => !v4Names.includes(c));
    const drift = v4.routingCategories.filter((c) => !idOf(c.categoryName)).map((c) => c.categoryName);

    console.log(`\n─ ${s.id}: ${s.title}  ·  ${s.city}`);
    console.log(`  why                : ${s.note}`);
    console.log(`  OLD primary        : ${oldPrimaryName ?? "(none)"} [${oldPrimaryId ?? "—"}]`);
    console.log(`  OLD categories (${s.oldCategories.length})  : ${fmtCats(s.oldCategories, idOf)}`);
    console.log(`  OLD categoryIds    : [${oldMapped.matchedIds.join(", ")}]`);
    console.log(`  V4 routing (${v4Names.length})      : ${fmtCats(v4Names, idOf)}`);
    console.log(`  V4 categoryIds     : [${v4Ids.join(", ")}]  (carried from request)`);
    console.log(`  drift (no fixture id): ${drift.length ? JSON.stringify(drift) : "(none)"}`);
    console.log(`  suppressed vs old  : ${suppressed.length ? JSON.stringify(suppressed) : "(none)"}`);
    console.log(`  project_type       : ${v4.projectType ?? "(none)"}`);
    console.log(`  routing_tags       : [${v4.routingTags.join(", ")}]`);
    console.log(`  routing_confidence : ${v4.routingConfidence.toFixed(2)}`);
    console.log(`  category_count     : ${v4Names.length}`);

    // Behavioural assertions per sample (the contract the shadow log must reflect).
    if (s.id === "req_2") {
      check(!v4Names.includes("Statybos darbai"), "req_2: 'Statybos darbai' must be suppressed");
      check(
        v4Ids.includes("cat_elektrikai") && v4Ids.includes("cat_santechnika"),
        "req_2: surviving categories keep their ORIGINAL ids (carried)",
      );
      check(v4.projectType === "Namo renovacija", "req_2: project_type should be 'Namo renovacija'");
      check(v4.routingTags.includes("subrangovų_paieška"), "req_2: should tag subrangovų_paieška");
    }
    if (s.id === "req_3") {
      check(v4Names.length === 1, "req_3: single category");
      check(!v4.routingTags.includes("reikia_kelių_specialistų"), "req_3: no multi-specialist tag");
    }
    if (s.id === "req_4") {
      check(v4Names.includes("Stogdengiai, stogo darbai"), "req_4: known category kept");
      check(v4Ids.includes("cat_stogai"), "req_4: known category keeps its ORIGINAL id (carried)");
      check(v4Names.includes("Lietaus nuvedimo sistemos"), "req_4: drift name still routed (carried, no crash)");
    }
    if (s.id === "req_5") {
      check(v4Names.length === 1 && v4Names[0] === "Griovimo darbai", "req_5: shrinks to Griovimo darbai");
      check(v4Ids[0] === "cat_griovimas", "req_5: surviving 'Griovimo darbai' keeps its ORIGINAL id");
    }
  }

  // Cross-cutting invariants.
  const idx2 = buildCategoryNameIndex(TAXONOMY, ALIASES);
  assert.equal(mapNameToCategoryId(idx2, "elektrikas"), "cat_elektrikai", "alias resolves");
  assert.equal(namesForIds(idx2, ["cat_stogai"])[0], "Stogdengiai, stogo darbai", "id→name resolves");
  assert.equal(mapNameToCategoryId(idx2, "Nėra tokios kategorijos"), null, "unknown → null (no throw)");

  console.log("\n──────────────────────────────────────────────────────────────────");
  if (failures === 0) {
    console.log(" RESULT: PASS — 5 samples routed, invariants hold, no crash on drift.");
    return 0;
  }
  console.log(` RESULT: FAIL — ${failures} assertion(s) failed.`);
  return 1;
}

process.exit(main());
