/**
 * Core unit tests for the multi-routing v4 classifier — the deterministic
 * "brain" of automatic category recognition. Covers every stage the identity
 * tests don't: folding, distinctive tokens, project-type detection, both
 * KEEP branches of catch-all suppression, the confidence formula, and tags.
 * Deterministic, no DB, no network.
 *
 * Run:  pnpm test:routing-v4
 */
import assert from "node:assert/strict";
import {
  classifyMultiRouting,
  detectProjectType,
  distinctiveTokens,
  fold,
  isListedCatchAll,
  type RoutingCandidate,
} from "../multi-routing-v4";

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

function cands(...names: string[]): RoutingCandidate[] {
  return names.map((n, i) => ({ categoryId: `id_${i}`, categoryName: n }));
}

console.log("multi-routing v4 — text normalization");

t("fold lowers case, trims, and folds all 9 Lithuanian diacritics", () => {
  assert.equal(fold("  ĄČĘĖĮŠŲŪŽ  "), "aceeisuuz");
  assert.equal(fold("Plytelių klijavimas"), "plyteliu klijavimas");
});

t("fold tolerates null/undefined/non-string input", () => {
  assert.equal(fold(null), "");
  assert.equal(fold(undefined), "");
  assert.equal(fold(123), "123");
});

t("distinctiveTokens drops generic trade words and short tokens", () => {
  // "darbai" is generic, "elektrikai"/"elektros" are the distinctive evidence
  assert.deepEqual(distinctiveTokens("Elektrikai, elektros darbai"), [
    "elektrikai",
    "elektros",
  ]);
  // "ir"/"kt" fall below the 4-char floor or the generic list
  assert.deepEqual(
    distinctiveTokens("Šiukšlių išvežimas: statybinių ir kt."),
    ["siuksliu", "isvezimas:", "statybiniu"],
  );
});

console.log("\nmulti-routing v4 — project type detection (folded input)");

t("namo renovacija / buto remontas / namo statyba hit their rules", () => {
  assert.equal(detectProjectType(fold("Namo renovacija ir apšiltinimas")), "Namo renovacija");
  assert.equal(detectProjectType(fold("Buto remontas nuo nulio")), "Buto remontas");
  assert.equal(detectProjectType(fold("Namo statyba Vilniaus rajone")), "Namo įrengimas");
});

t("specific rules win over the generic scope pattern", () => {
  // "pilnas buto remontas" matches BOTH rule 2 and PROJECT_SCOPE — rule must win
  assert.equal(detectProjectType(fold("Pilnas buto remontas")), "Buto remontas");
});

t("scope-only keywords yield 'Project scope'; plain trades yield null", () => {
  assert.equal(detectProjectType(fold("Ieškome rangovo darbams")), "Project scope");
  assert.equal(detectProjectType(fold("namas po raktu")), "Project scope");
  assert.equal(detectProjectType(fold("Kompleksiniai darbai: stogas, langai")), "Project scope");
  assert.equal(detectProjectType(fold("Reikia santechniko")), null);
});

console.log("\nmulti-routing v4 — candidate de-duplication");

t("duplicate names (case/diacritic variants) collapse to the FIRST candidate's id", () => {
  const r = classifyMultiRouting({
    title: "Plytelių klijavimas",
    description: "",
    candidates: [
      { categoryId: "id_first", categoryName: "Plytelių klijavimas" },
      { categoryId: "id_dup", categoryName: "PLYTELIU KLIJAVIMAS" },
    ],
  });
  assert.equal(r.routingCategories.length, 1);
  assert.equal(r.routingCategories[0].categoryId, "id_first");
  assert.equal(r.routingCategories[0].categoryName, "Plytelių klijavimas");
});

t("blank/whitespace-only names are skipped, never routed", () => {
  const r = classifyMultiRouting({
    title: "Elektros darbai",
    description: "",
    candidates: [
      { categoryId: "id_blank", categoryName: "   " },
      { categoryId: "id_ok", categoryName: "Elektrikai, elektros darbai" },
    ],
  });
  assert.deepEqual(r.routingCategories.map((c) => c.categoryId), ["id_ok"]);
});

t("empty candidate list returns empty routing with floor confidence", () => {
  const r = classifyMultiRouting({ title: "Bet kas", description: "", candidates: [] });
  assert.deepEqual(r.routingCategories, []);
  assert.equal(r.routingConfidence, 0.4);
  assert.ok(!r.routingTags.includes("reikia_kelių_specialistų"));
});

console.log("\nmulti-routing v4 — catch-all suppression (all four branches)");

t("suppressible catch-all DROPS: specific survivor + no text evidence", () => {
  for (const catchAll of [
    "Statybos darbai",
    "Smulkūs statybos darbai",
    "Šiukšlių išvežimas: statybinių ir kt.",
    "Fasadų apdaila, dažymas",
  ]) {
    const r = classifyMultiRouting({
      title: "Elektros instaliacija",
      description: "Reikia pakeisti elektros instaliaciją bute.",
      candidates: cands(catchAll, "Elektrikai, elektros darbai"),
    });
    assert.deepEqual(
      r.routingCategories.map((c) => c.categoryName),
      ["Elektrikai, elektros darbai"],
      `'${catchAll}' should be suppressed`,
    );
  }
});

t("suppressible catch-all KEPT when the text carries stem-level evidence", () => {
  const r = classifyMultiRouting({
    title: "Griovimas ir išvežimas",
    description: "Po griovimo reikės išvežti statybines šiukšles.",
    candidates: cands("Šiukšlių išvežimas: statybinių ir kt.", "Griovimo darbai"),
  });
  const names = r.routingCategories.map((c) => c.categoryName);
  assert.ok(names.includes("Šiukšlių išvežimas: statybinių ir kt."), "evidence must keep the catch-all");
  assert.ok(names.includes("Griovimo darbai"));
});

t("suppressible catch-all KEPT when a PREFIXED VERB carries the evidence (v4.1)", () => {
  // "perdažyti" must evidence "dažymas" — the verb prefix defeated the old
  // 5-char stems and caused 6/10 harmful drops on the golden-300.
  const r = classifyMultiRouting({
    title: "Meistro darbams prie namo",
    description: "Perkloti trinkeles ir perdažyti tvorą bei vartelius.",
    candidates: cands("Fasadų apdaila, dažymas", "Trinkelių klojimas"),
  });
  const names = r.routingCategories.map((c) => c.categoryName);
  assert.ok(names.includes("Fasadų apdaila, dažymas"), "prefixed verb must keep the catch-all");
  assert.equal(r.routingCategories.length, 2);
});

t("suppression is SKIPPED when a project type is detected (v4.1)", () => {
  // A whole-project request ("namo renovacija") legitimately spans broad
  // catch-all trades — the human gold labels keep them.
  const r = classifyMultiRouting({
    title: "1920 statybos namo renovacija",
    description: "Norime atnaujinti seną sodybos namą, svarbiausia sutvarkyti stogą.",
    candidates: cands("Statybos darbai", "Stogdengiai, stogo darbai"),
  });
  assert.equal(r.projectType, "Namo renovacija");
  const names = r.routingCategories.map((c) => c.categoryName);
  assert.ok(names.includes("Statybos darbai"), "project scope must disable suppression");
  assert.equal(r.routingCategories.length, 2);
});

t("suppressible catch-all KEPT when NO truly specific category survives", () => {
  // Both candidates are listed catch-alls → the suppression gate never opens,
  // otherwise the request would route to nothing.
  const r = classifyMultiRouting({
    title: "Įvairūs darbai",
    description: "Reikia pagalbos namuose.",
    candidates: cands("Statybos darbai", "Vidaus apdailos darbai"),
  });
  assert.equal(r.routingCategories.length, 2);
});

t("listed-but-NOT-suppressible catch-alls are never dropped", () => {
  for (const protectedCatchAll of ["Vidaus apdailos darbai", "Meistrai į namus"]) {
    const r = classifyMultiRouting({
      title: "Elektros instaliacija",
      description: "Reikia pakeisti elektros instaliaciją bute.",
      candidates: cands(protectedCatchAll, "Elektrikai, elektros darbai"),
    });
    const names = r.routingCategories.map((c) => c.categoryName);
    assert.ok(names.includes(protectedCatchAll), `'${protectedCatchAll}' must survive`);
    assert.equal(r.routingCategories.length, 2);
  }
});

t("isListedCatchAll matches folded prefixes, not unrelated trades", () => {
  assert.ok(isListedCatchAll("Šiukšlių išvežimas: statybinių ir kt."));
  assert.ok(isListedCatchAll("Meistrai į namus"));
  assert.ok(!isListedCatchAll("Griovimo darbai"));
  // exact-match pattern must not swallow longer names
  assert.ok(!isListedCatchAll("Statybos darbai aukštyje"));
});

console.log("\nmulti-routing v4 — confidence formula");

t("fully grounded single candidate scores 0.9; with project type caps at 1.0", () => {
  const base = {
    title: "Elektros instaliacija",
    description: "Reikia elektros instaliacijos bute.",
    candidates: cands("Elektrikai, elektros darbai"),
  };
  assert.equal(classifyMultiRouting(base).routingConfidence, 0.9);
  const withProject = classifyMultiRouting({
    ...base,
    description: "Buto remontas: reikia elektros instaliacijos.",
  });
  assert.equal(withProject.projectType, "Buto remontas");
  assert.equal(withProject.routingConfidence, 1.0);
});

t("ungrounded routing floors at 0.4", () => {
  const r = classifyMultiRouting({
    title: "Reikia pagalbos",
    description: "Susisiekite su manimi.",
    candidates: cands("Trinkelių klojimas"),
  });
  assert.equal(r.routingConfidence, 0.4);
});

t("partial grounding rounds to 2 decimals (1 of 3 grounded → 0.57)", () => {
  const r = classifyMultiRouting({
    title: "Elektros instaliacija",
    description: "Reikia elektros instaliacijos.",
    candidates: cands(
      "Elektrikai, elektros darbai",
      "Santechnikai, santechnikos darbai",
      "Trinkelių klojimas",
    ),
  });
  // 0.4 + 0.5 * (1/3) = 0.5666… → 0.57
  assert.equal(r.routingConfidence, 0.57);
});

t("confidence always stays within [0, 1]", () => {
  const r = classifyMultiRouting({
    title: "Namo renovacija po raktu",
    description: "Visi darbai nuo a iki z: elektra, santechnika.",
    candidates: cands("Elektrikai, elektros darbai", "Santechnikai, santechnikos darbai"),
  });
  assert.ok(r.routingConfidence >= 0 && r.routingConfidence <= 1);
});

console.log("\nmulti-routing v4 — routing tags");

t("reikia_kelių_specialistų appears only when ≥2 categories survive", () => {
  const multi = classifyMultiRouting({
    title: "Remontas",
    description: "",
    candidates: cands("Elektrikai, elektros darbai", "Santechnikai, santechnikos darbai"),
  });
  assert.ok(multi.routingTags.includes("reikia_kelių_specialistų"));
  const single = classifyMultiRouting({
    title: "Remontas",
    description: "",
    candidates: cands("Elektrikai, elektros darbai"),
  });
  assert.ok(!single.routingTags.includes("reikia_kelių_specialistų"));
});

t("subrangovų_paieška triggers via keyword AND via detected project type", () => {
  const viaKeyword = classifyMultiRouting({
    title: "Ieškome subrangovų",
    description: "",
    candidates: cands("Statybos darbai"),
  });
  assert.ok(viaKeyword.routingTags.includes("subrangovų_paieška"));
  const viaProject = classifyMultiRouting({
    title: "Namo renovacija",
    description: "Šiltinimas ir stogas.",
    candidates: cands("Stogdengiai, stogo darbai"),
  });
  assert.equal(viaProject.projectType, "Namo renovacija");
  assert.ok(viaProject.routingTags.includes("subrangovų_paieška"));
});

t("aktyvi_užklausa honors status (case/diacritic-insensitive) and isActive", () => {
  const open = classifyMultiRouting({
    title: "X",
    description: "",
    candidates: cands("Griovimo darbai"),
    status: "OPEN",
  });
  assert.ok(open.routingTags.includes("aktyvi_užklausa"));
  const aktyviLt = classifyMultiRouting({
    title: "X",
    description: "",
    candidates: cands("Griovimo darbai"),
    status: "Aktyvi",
  });
  assert.ok(aktyviLt.routingTags.includes("aktyvi_užklausa"));
  const stopped = classifyMultiRouting({
    title: "X",
    description: "",
    candidates: cands("Griovimo darbai"),
    status: "Užklausa sustabdyta. Klientas rado paslaugų teikėją.",
  });
  assert.ok(!stopped.routingTags.includes("aktyvi_užklausa"));
  const viaFlag = classifyMultiRouting({
    title: "X",
    description: "",
    candidates: cands("Griovimo darbai"),
    status: "PENDING",
    isActive: true,
  });
  assert.ok(viaFlag.routingTags.includes("aktyvi_užklausa"));
});

console.log(failures === 0 ? "\nRESULT: PASS" : `\nRESULT: FAIL — ${failures} failure(s)`);
process.exit(failures === 0 ? 0 : 1);
