/**
 * Faithful TypeScript port of the offline multi-routing **v4** classifier
 * (`~/Documents/KATEGORIJOS + 200K-uzklausu/scripts/ai-routing/`
 * `multi_routing_classifier.py` → `classify()`).
 *
 * Deterministic, dependency-free, NO LLM. See
 * `docs/ai-routing/marketplace-platform-routing-integration-audit.md` §9.
 *
 * Phase 1 uses this in SHADOW mode only — its output is logged for comparison
 * and never affects provider notifications, lead visibility, or payments.
 *
 * Output mirrors v4 exactly:
 *   { routingCategories, projectType, routingTags, routingConfidence }
 * `routingCategories` are canonical Lithuanian category NAME strings (not ids).
 */

export const ROUTING_VERSION = "multi-routing-v4";

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
const PROJECT_SCOPE =
  /po raktu|visus darbus|visi darbai|visus statyb|rangov|generalin|nuo a iki z|kompleksisk|visa projekt|pilna apdail|pilnas remont/;

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

function stem(t: string): string {
  return t.length > 5 ? t.slice(0, 5) : t;
}

function textStemSet(text: string): Set<string> {
  const set = new Set<string>();
  for (const w of text.match(/\w+/g) ?? []) set.add(stem(w));
  return set;
}

function catchAllHasTextEvidence(cat: string, textStems: Set<string>): boolean {
  return distinctiveTokens(cat).some((t) => textStems.has(stem(t)));
}

const ACTIVE_STATUS = new Set([
  "new", "active", "aktyvi", "aktyvus", "aktyvuota", "open",
]);

export interface MultiRoutingInput {
  title?: string | null;
  description?: string | null;
  /**
   * Candidate trade categories as canonical NAME strings. In the offline v4 these
   * come from the bot's `suggested_primary/secondary_categories` (or `raw_categories`);
   * in Phase 1 shadow mode they are the request's already-curated category names.
   */
  candidateCategories: string[];
  /** Request status (e.g. "OPEN"); drives the `aktyvi_užklausa` tag. */
  status?: string | null;
  isActive?: boolean;
}

export interface MultiRoutingResult {
  routingCategories: string[];
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

  // candidates: de-duplicated by folded form, original order preserved.
  const seen = new Set<string>();
  const cands: string[] = [];
  for (const c of input.candidateCategories ?? []) {
    const v = (c ?? "").trim();
    if (v && !seen.has(fold(v))) {
      seen.add(fold(v));
      cands.push(v);
    }
  }

  let routing = [...cands]; // v1 baseline: route to all candidate trades

  // Drop a suppressible catch-all only when (a) at least one truly specific
  // (non-catch-all) category survives AND (b) the catch-all has no stem-level
  // evidence in the request text. Conservative subset only.
  if (routing.some((c) => !isListedCatchAll(c))) {
    const ts = textStemSet(text);
    routing = routing.filter(
      (c) => !isSuppressibleCatchAll(c) || catchAllHasTextEvidence(c, ts),
    );
  }

  const projectType = detectProjectType(text);

  // confidence = how grounded the routing is in the request text, nudged by a
  // detected project scope. Bounded to [0, 1].
  let grounded = 0;
  for (const c of routing) {
    const toks = distinctiveTokens(c);
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
