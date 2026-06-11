/**
 * TypeScript port of the offline multi-routing **v4** classifier
 * (`~/Documents/KATEGORIJOS + 200K-uzklausu/scripts/ai-routing/`
 * `multi_routing_classifier.py` → `classify()`).
 *
 * Deterministic, dependency-free, NO LLM. See
 * `docs/ai-routing/marketplace-platform-routing-integration-audit.md` §9.
 *
 * v4.1 diverges from the Python reference in two KEEP-direction-only ways,
 * both driven by the golden-300 human labels (`pnpm routing:eval-golden`):
 *   1. catch-all text evidence is prefix-tolerant (a prefixed verb like
 *      "perdažyti" now counts as evidence for "dažymas"), and
 *   2. suppression is skipped entirely when a project type is detected —
 *      whole-project requests legitimately span broad catch-all trades.
 * Suppression still only ever REMOVES candidates, so v4.1 can only keep
 * MORE than v4 — never route to anything v4 wouldn't have.
 *
 * Phase 1 uses this in SHADOW mode only — its output is logged for comparison
 * and never affects provider notifications, lead visibility, or payments.
 *
 * Output:
 *   { routingCategories, projectType, routingTags, routingConfidence }
 * `routingCategories` are the surviving candidates as `{ categoryId, categoryName }`
 * objects — v4 filters/suppresses by name + text but PRESERVES each candidate's
 * id, so Phase 1 never re-resolves a name back to an id (ambiguous for
 * DISTINCT_TAX duplicates). See docs/ai-routing/phase-a2-routing-contract-plan.md.
 */

export const ROUTING_VERSION = "multi-routing-v4.1";

// Lithuanian diacritic folding (self-contained; matches the Python `_DIA`).
const DIA: Record<string, string> = {
  ą: "a", č: "c", ę: "e", ė: "e", į: "i", š: "s", ų: "u", ū: "u", ž: "z",
};

export function fold(s: unknown): string {
  const str = s == null ? "" : String(s);
  return str.trim().toLowerCase().replace(/[ąčęėįšųūž]/g, (c) => DIA[c] ?? c);
}

// Tokens too generic to be distinctive evidence for a trade (Python `_GENERIC`).
const GENERIC = new Set([
  "darbai", "darbas", "paslaugos", "paslauga", "kiti", "kita", "kt",
  "namus", "namo", "namu", "bei", "ir", "montavimas", "irengimas",
  "remontas", "sistemos", "sistema",
]);

export function distinctiveTokens(cat: string): string[] {
  const toks = fold(cat).split(/[\s,/]+/).filter((t) => t.length >= 4);
  return toks.filter((t) => !GENERIC.has(t));
}

// project_type detection (matched against folded "title . description").
const PROJECT_RULES: Array<[RegExp, string]> = [
  [/namo (renovacij|rekonstrukcij|atnaujinim)/, "Namo renovacija"],
  [/buto (remont|irengim|apdail|renovacij|tvarkym)/, "Buto remontas"],
  [/namo (irengim|statyb|apdail|pastatym|pridavim)/, "Namo įrengimas"],
];
// v4.1: "kompleksin" added — "kompleksiniai darbai" is an explicit whole-project
// marker the Python "kompleksisk" (kompleksiškai) variant missed (golden 3959338).
const PROJECT_SCOPE =
  /po raktu|visus darbus|visi darbai|visus statyb|rangov|generalin|nuo a iki z|kompleksisk|kompleksin|visa projekt|pilna apdail|pilnas remont/;

export function detectProjectType(textFolded: string): string | null {
  for (const [rx, label] of PROJECT_RULES) {
    if (rx.test(textFolded)) return label;
  }
  if (PROJECT_SCOPE.test(textFolded)) return "Project scope";
  return null;
}

// Listed generic catch-alls (folded-form match). Used only to define "specific":
// a "specific" category is one NOT in this list (Python `_LISTED_CATCH_ALL_PATTERNS`).
const LISTED_CATCH_ALL: RegExp[] = [
  /^vidaus apdailos darb/,
  /^meistrai i namus/,
  /^statybos darbai$/,
  /^smulkus statybos darb/,
  /^siuksliu isvezim/,
  /^fasadu apdaila/,
];

// Subset suppressed when text evidence is missing. "Vidaus apdailos darbai" and
// "Meistrai į namus" are intentionally excluded (Python `_SUPPRESSIBLE_CATCH_ALL_PATTERNS`).
const SUPPRESSIBLE_CATCH_ALL: RegExp[] = [
  /^statybos darbai$/,
  /^smulkus statybos darb/,
  /^siuksliu isvezim/,
  /^fasadu apdaila/,
];

export function isListedCatchAll(cat: string): boolean {
  const f = fold(cat);
  return LISTED_CATCH_ALL.some((p) => p.test(f));
}

function isSuppressibleCatchAll(cat: string): boolean {
  const f = fold(cat);
  return SUPPRESSIBLE_CATCH_ALL.some((p) => p.test(f));
}

// Common Lithuanian verb prefixes (longest first; reflexive -si- forms before
// their bases). Stripping them lets a prefixed infinitive ("perdažyti") count
// as evidence for the trade noun it derives from ("dažymas"). Only words
// ending in "-ti" are stripped: request grammar is dominated by "reikia
// X-ti", and stripping nouns invents false roots ("pastato" → "stato" would
// fake evidence for "statybinių").
const VERB_PREFIXES = [
  "persi", "nusi", "issi", "apsi", "atsi", "uzsi", "prisi", "susi", "pasi",
  "par", "per", "nu", "is", "ap", "at", "uz", "pri", "su", "pa",
];

function sharedPrefixLen(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a[i] === b[i]) i += 1;
  return i;
}

interface TextEvidence {
  words: string[];
  strippedVerbs: string[];
}

function textEvidenceWords(text: string): TextEvidence {
  const words: string[] = [];
  const strippedVerbs: string[] = [];
  for (const w of text.match(/\w+/g) ?? []) {
    words.push(w);
    if (!w.endsWith("ti")) continue;
    for (const p of VERB_PREFIXES) {
      if (w.startsWith(p) && w.length - p.length >= 4) {
        strippedVerbs.push(w.slice(p.length));
        break;
      }
    }
  }
  return { words, strippedVerbs };
}

// Plain words match on a ≥5-char shared prefix (or the whole 4-char word) —
// equivalent to the old 5-char stems but declension-tolerant. Stripped
// infinitives get a 4-char threshold so a verb root can reach its trade noun
// ("dažyti" ~ "dažymas" share only 4); plain words stay at 5 to keep
// near-misses like "išvengti" ~ "išvežimas" from faking evidence.
function catchAllHasTextEvidence(cat: string, ev: TextEvidence): boolean {
  return distinctiveTokens(cat).some(
    (t) =>
      ev.words.some(
        (w) => w.length >= 4 && sharedPrefixLen(t, w) >= Math.min(5, t.length, w.length),
      ) || ev.strippedVerbs.some((w) => sharedPrefixLen(t, w) >= 4),
  );
}

const ACTIVE_STATUS = new Set([
  "new", "active", "aktyvi", "aktyvus", "aktyvuota", "open",
]);

/**
 * A candidate category carrying BOTH its stable marketplace identity and its
 * canonical name. v4 filters by name/text but keeps the id, so a kept category
 * always retains the id the caller supplied — never a re-resolved duplicate.
 */
export interface RoutingCandidate {
  categoryId: string;
  categoryName: string;
}

export interface MultiRoutingInput {
  title?: string | null;
  description?: string | null;
  /**
   * Candidate trade categories, each carrying its `categoryId` + `categoryName`.
   * In Phase 1 shadow mode these are the request's already-curated categories, so
   * every kept category keeps the request's own id. In the offline v4 they
   * originate from the bot's suggested/raw categories.
   */
  candidates: RoutingCandidate[];
  /** Request status (e.g. "OPEN"); drives the `aktyvi_užklausa` tag. */
  status?: string | null;
  isActive?: boolean;
}

export interface MultiRoutingResult {
  /** Surviving candidates, identity (id + name) preserved — never re-mapped. */
  routingCategories: RoutingCandidate[];
  projectType: string | null;
  routingTags: string[];
  routingConfidence: number;
}

/**
 * Port of `multi_routing_classifier.classify()`. Returns the v4 routing fields.
 * Pure: no I/O, no DB, no randomness — safe to unit-test and run in shadow.
 */
export function classifyMultiRouting(input: MultiRoutingInput): MultiRoutingResult {
  const title = input.title ?? "";
  const desc = input.description ?? "";
  const text = fold(`${title} . ${desc}`);

  // candidates: de-duplicated by folded NAME, original order + identity preserved.
  const seen = new Set<string>();
  const cands: RoutingCandidate[] = [];
  for (const c of input.candidates ?? []) {
    const name = (c?.categoryName ?? "").trim();
    if (!name) continue;
    const f = fold(name);
    if (seen.has(f)) continue;
    seen.add(f);
    cands.push({ categoryId: c.categoryId, categoryName: name });
  }

  let routing = [...cands]; // v1 baseline: route to all candidate trades

  const projectType = detectProjectType(text);

  // Drop a suppressible catch-all only when (a) no project scope was detected —
  // a whole-project request legitimately needs broad trades (golden-300:
  // suppression there contradicted the human label), (b) at least one truly
  // specific (non-catch-all) category survives AND (c) the catch-all has no
  // prefix-level evidence in the request text. Conservative subset only.
  // Suppression only ever REMOVES candidates — it never re-maps, so kept
  // categories keep their id.
  if (!projectType && routing.some((c) => !isListedCatchAll(c.categoryName))) {
    const ev = textEvidenceWords(text);
    routing = routing.filter(
      (c) => !isSuppressibleCatchAll(c.categoryName) || catchAllHasTextEvidence(c.categoryName, ev),
    );
  }

  // confidence = how grounded the routing is in the request text, nudged by a
  // detected project scope. Bounded to [0, 1].
  let grounded = 0;
  for (const c of routing) {
    const toks = distinctiveTokens(c.categoryName);
    if (toks.length && toks.some((t) => text.includes(t))) grounded += 1;
  }
  const share = routing.length ? grounded / routing.length : 0;
  const conf = 0.4 + 0.5 * share + (projectType ? 0.1 : 0);
  const routingConfidence = Math.round(Math.max(0, Math.min(1, conf)) * 100) / 100;

  const tags: string[] = [];
  if (routing.length >= 2) tags.push("reikia_kelių_specialistų");
  if (projectType || /rangov|subrangov|po raktu|visus darbus/.test(text)) {
    tags.push("subrangovų_paieška");
  }
  if (input.isActive || ACTIVE_STATUS.has(fold(input.status ?? ""))) {
    tags.push("aktyvi_užklausa");
  }

  return {
    routingCategories: routing,
    projectType,
    routingTags: tags,
    routingConfidence,
  };
}
