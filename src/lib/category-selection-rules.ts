export interface CategorySelectionCandidate {
  id: string;
  slug: string;
  name: string;
  depth: number | null;
  parentId: string | null;
  rootId: string | null;
}

type ServiceDomain =
  | "plumbing"
  | "electrical"
  | "tiling"
  | "terrace"
  | "access_security"
  | "kitchen_furniture"
  | "irrigation"
  | "solar"
  | "design_project"
  | "demolition"
  | "bathroom_renovation";

interface RequestIntent {
  domains: Set<ServiceDomain>;
  hasRepairAction: boolean;
  hasInstallAction: boolean;
  hasBuildAction: boolean;
  hasDesignAction: boolean;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

function tokenize(value: string): string[] {
  return normalize(value)
    .split(/[\s-]+/)
    .filter((token) => token.length >= 3);
}

function stem(token: string): string {
  return token.slice(0, Math.min(5, token.length));
}

function hasAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(text));
}

// Lithuanian verbal/derivational prefixes attach in front of a root, which
// defeats a plain `\b` anchor: "su"+"montuoti" → "sumontuoti", "į"+"stiklinti"
// → "istiklinti". Without tolerating them, the gates only matched the bare noun
// form and silently dropped the (more common) prefixed verb form. `root()` keeps
// the word-start anchor but allows one optional known prefix, so the empty-prefix
// case is still exactly the old `\b<root>` behaviour — a strict superset.
const LT_PREFIX = "(?:ap|at|be|i|is|nu|pa|par|per|pra|pri|sa|su|uz)?";
function root(r: string): RegExp {
  return new RegExp(`\\b${LT_PREFIX}${r}`);
}

function inferRequestIntent(normalizedText: string): RequestIntent {
  const domains = new Set<ServiceDomain>();
  const hasRepairAction = hasAny(normalizedText, [
    root("tais"),
    root("remont"),
    root("sutvark"),
    root("salint"),
    // 3rd-person symptom verbs stay as exact words — prefixing them is not idiomatic.
    /\bvarva\b/,
    /\bbega\b/,
    /\bteka\b/,
    /\bleidzia\b/,
    /\bprateka\b/,
    root("nuotek"),
    root("gedim"),
  ]);
  const hasInstallAction = hasAny(normalizedText, [root("mont"), root("ireng"), root("pajung"), root("prijung")]);
  const hasBuildAction = hasAny(normalizedText, [root("gamin"), root("pastat"), root("statyb"), root("ireng")]);
  const hasDesignAction = hasAny(normalizedText, [root("projekt"), root("dizain"), root("brezin"), root("schem")]);

  if (
    hasAny(normalizedText, [
      /\bkriaukl/,
      /\bciaup/,
      /\bmaisytuv/,
      /\bsifon/,
      /\bklozet/,
      /\bunitaz/,
      /\bvamzd/,
      /\bvanduo\b/,
      /\bvandent/,
      /\bvarva\b/,
      /\bbega\b/,
      /\bteka\b/,
      /\bleidzia\b/,
      /\bnuotek/,
      /\bsantechnik/,
    ])
  ) {
    domains.add("plumbing");
  }
  if (hasAny(normalizedText, [/\belektr/, /\brozet/, /\bjungikl/, /\bskydin/, /\blaid/, /\bkabel/])) {
    domains.add("electrical");
  }
  if (hasAny(normalizedText, [/\bplytel/, /\bklijav/, /\bklijuot/])) {
    domains.add("tiling");
  }
  if (hasAny(normalizedText, [/\bteras/])) {
    domains.add("terrace");
  }
  if (hasAny(normalizedText, [/\btelefonspyn/, /\bdomofon/, /\bduru skamb/, /\bkamera/, /\bvaizdo stebej/])) {
    domains.add("access_security");
  }
  if (hasAny(normalizedText, [/\bbald/, /\bspintel/, /\bstalvirs/, /\bvirtuves komplekt/])) {
    domains.add("kitchen_furniture");
  }
  if (hasAny(normalizedText, [/\blaist/])) {
    domains.add("irrigation");
  }
  if (hasAny(normalizedText, [/\bsaul/, /\bsolar/])) {
    domains.add("solar");
  }
  if (hasDesignAction) {
    domains.add("design_project");
  }
  if (hasAny(normalizedText, [/\bdemont/, /\bardym/, /\bisard/, /\bgriov/, /\bnuimt/])) {
    domains.add("demolition");
  }
  if (hasAny(normalizedText, [/\bvonios remont/, /\bvonios renov/, /\bpiln.*von/])) {
    domains.add("bathroom_renovation");
  }

  return { domains, hasRepairAction, hasInstallAction, hasBuildAction, hasDesignAction };
}

function candidateDomains(candidate: CategorySelectionCandidate): Set<ServiceDomain> {
  const value = normalize(`${candidate.slug} ${candidate.name}`);
  const domains = new Set<ServiceDomain>();

  if (hasAny(value, [/\bsantechnik/, /\bvandent/, /\bkriaukl/, /\bciaup/, /\bmaisytuv/, /\bklozet/, /\bunitaz/, /\bvamzd/, /\bnuotek/])) {
    domains.add("plumbing");
  }
  if (hasAny(value, [/\belektr/, /\brozet/, /\bjungikl/, /\bskydin/, /\bkabel/])) {
    domains.add("electrical");
  }
  if (hasAny(value, [/\bplytel/])) {
    domains.add("tiling");
  }
  if (hasAny(value, [/\bteras/])) {
    domains.add("terrace");
  }
  if (hasAny(value, [/\btelefonspyn/, /\bdomofon/, /\bkamera/, /\bsignaliz/, /\bapsaugos sist/])) {
    domains.add("access_security");
  }
  if (hasAny(value, [/\bvirtuves bald/, /\bbaldu gamyb/, /\bbaldu projekt/])) {
    domains.add("kitchen_furniture");
  }
  if (hasAny(value, [/\blaist/])) {
    domains.add("irrigation");
  }
  if (hasAny(value, [/\bsaules elektr/])) {
    domains.add("solar");
  }
  if (hasAny(value, [/\bprojekt/, /\bdizainer/, /\bbrezin/])) {
    domains.add("design_project");
  }
  if (hasAny(value, [/\bdemont/, /\bgriov/])) {
    domains.add("demolition");
  }
  if (hasAny(value, [/\bvonios remont/, /\bvonios renov/])) {
    domains.add("bathroom_renovation");
  }

  return domains;
}

function intersects<T>(a: Set<T>, b: Set<T>): boolean {
  for (const item of a) {
    if (b.has(item)) return true;
  }
  return false;
}

const GENERIC_CATEGORY_TOKENS = new Set([
  "darbas",
  "darbai",
  "paslauga",
  "paslaugos",
  "meistrai",
  "meistras",
  "specialistai",
  "specialistas",
  "irengimas",
  "irengimo",
  "montavimas",
  "montavimo",
  "sistema",
  "sistemos",
  "prieziura",
  "prieziuros",
  "gamyba",
  "gamybos",
  "keitimas",
  "keitimo",
  "remontas",
  "remonto",
  // "valymas" is the action, not the distinctive noun: every "X valymas" leaf is
  // told apart by X (langų / kilimų / virusų). Without this, a generic request
  // like "biuro valymas" matched "Virusų valymas" (IT) on the shared word alone.
  "valymas",
  "valymo",
]);

const CONTEXT_ONLY_TOKENS = new Set([
  "bute",
  "namuose",
  "name",
  "kotedze",
  "kambaryje",
  "kambarys",
  "vonioje",
  "vonia",
  "vonios",
  "virtuveje",
  "virtuve",
  "lauke",
  "viduje",
  // Workplace location nouns: a setting, not a service. "biuro" alone matched
  // "Biuro baldų gamyba" (furniture) for an office-cleaning request.
  "biuro",
  "biure",
  "ofise",
  "ofisas",
]);

// True when two tokens are the same word up to Lithuanian declension, WITHOUT
// conflating two different words that merely share a short stem. The old check
// matched on a 5-char stem, which collided unrelated long words ("perda"zymas ~
// "perda"ngos, "elekt"riko ~ "elekt"roninių). Rule: containment, OR a ≥6-char
// shared prefix (a real shared root: "elektros" ~ "elektriko"), OR a 5-char prefix
// only when the words differ solely in a short ending — i.e. a 5-char root's
// declension ("teras-a" ~ "teras-u"), which excludes long divergent words.
const MIN_STRONG_PREFIX = 6;
const MAX_DECLENSION_TAIL = 2;
// Containment counts only when the shorter token is at least this long. Without it,
// a 3-4 char function word ("kas"/"per"/"apie") substring-matched a real category
// token ("kas" ⊂ "kasimas" routed "kas savaitę" to pond-digging). Real shared roots
// reached by containment ("dažymas" ⊂ "perdažymas", "baldu" ⊂ "baldus") are ≥5.
const MIN_CONTAINMENT = 5;

function tokensCohere(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.min(a.length, b.length) >= MIN_CONTAINMENT && (a.includes(b) || b.includes(a))) {
    return true;
  }
  let i = 0;
  const n = Math.min(a.length, b.length);
  while (i < n && a[i] === b[i]) i += 1;
  if (i >= MIN_STRONG_PREFIX) return true;
  if (i >= 5 && Math.max(a.length, b.length) - i <= MAX_DECLENSION_TAIL) return true;
  return false;
}

function hasSpecificNameEvidence(candidate: CategorySelectionCandidate, text: string): boolean {
  const textTokens = tokenize(text);
  const specificNameTokens = tokenize(candidate.name).filter(
    (token) => !GENERIC_CATEGORY_TOKENS.has(token) && !CONTEXT_ONLY_TOKENS.has(token),
  );

  return specificNameTokens.some((token) =>
    textTokens.some((textToken) => tokensCohere(textToken, token)),
  );
}

function passesActionGate(candidate: CategorySelectionCandidate, normalizedText: string): boolean {
  const slugAndName = normalize(`${candidate.slug} ${candidate.name}`);

  if (slugAndName.includes("plyteliu-demontavimas")) {
    return hasAny(normalizedText, [/\bdemont/, /\bardym/, /\bisard/, /\bnuimt/, /\bsalint/, /\bgriov/]);
  }

  if (slugAndName.includes("plyteliu-pjovimas") || slugAndName.includes("plyteliu pjovimas")) {
    return hasAny(normalizedText, [root("pjov"), root("pjaust")]);
  }

  if (slugAndName.includes("vonios-remontas") || slugAndName.includes("vonios remontas")) {
    return hasAny(normalizedText, [root("remont"), root("renov"), root("perdar"), root("kapital"), root("piln")]);
  }

  if (slugAndName.includes("restauravimas") || slugAndName.includes("restaurav")) {
    return hasAny(normalizedText, [root("restaur")]);
  }

  if (slugAndName.includes("nuotekio-reles") || slugAndName.includes("nuotekio reles")) {
    return hasAny(normalizedText, [root("rele"), root("elektr"), root("skydin"), root("automat")]);
  }

  if (
    slugAndName.includes("vandentiekiu-kanalizacijos-irengimas") ||
    slugAndName.includes("vandentiekio-kanalizacijos-irengimas") ||
    slugAndName.includes("vandentiekiu kanalizacijos irengimas") ||
    slugAndName.includes("vandentiekio kanalizacijos irengimas")
  ) {
    return hasAny(normalizedText, [root("ireng"), root("nauj"), root("vedziot"), root("kloj"), root("tras")]);
  }

  if (slugAndName.includes("nuoteku-isvezimas") || slugAndName.includes("nuoteku isvezimas")) {
    return hasAny(normalizedText, [root("isvez"), root("issiurb"), root("siurb")]);
  }

  if (slugAndName.includes("nuoteku-valymo") || slugAndName.includes("nuoteku valymo")) {
    return hasAny(normalizedText, [/\bvalymo irengin/, /\bnuoteku valym/]);
  }

  if (slugAndName.includes("laistymo")) {
    return hasAny(normalizedText, [root("laist")]);
  }

  if (slugAndName.includes("alyvavimas")) {
    return hasAny(normalizedText, [root("alyv")]);
  }

  if (slugAndName.includes("stiklinimas")) {
    return hasAny(normalizedText, [root("stiklin")]);
  }

  if (slugAndName.includes("tentai") || slugAndName.includes("tentu")) {
    return hasAny(normalizedText, [/\btent/]);
  }

  if (slugAndName.includes("plovimas") || slugAndName.includes("atnaujinimas")) {
    // "valy" covers the cleaning synonym (nuvalyti) — window/surface washing is
    // requested as often with "valyti" as with "plauti".
    return hasAny(normalizedText, [root("plov"), root("atnaujin"), root("valy")]);
  }

  if (slugAndName.includes("terasines-lentos") || slugAndName.includes("terasines lentos")) {
    return hasAny(normalizedText, [root("lent")]);
  }

  if (slugAndName.includes("skulptur")) {
    return hasAny(normalizedText, [root("skulpt")]);
  }

  if (slugAndName.includes("ip-kameru") || slugAndName.includes("kameru montavimas")) {
    return hasAny(normalizedText, [/\bkamer/, /\bvaizdo stebej/]);
  }

  if (
    slugAndName.includes("elektrikai-elektros-darbai--signalizacijos-kameros") ||
    slugAndName.includes("elektros darbai signalizacijos")
  ) {
    return hasAny(normalizedText, [/\belektr/, /\blaid/, /\bkabel/]);
  }

  if (slugAndName.includes("saules-elektriniu") || slugAndName.includes("saules elektriniu")) {
    return hasAny(normalizedText, [/\bsaul/, /\bsolar/]);
  }

  if (slugAndName.includes("projektai") || slugAndName.includes("projektavimas")) {
    // "dizain" admits the common phrasing "ieškau dizainerio" without an explicit
    // "projektas" — design intent is the same.
    return hasAny(normalizedText, [root("projekt"), root("dizain"), root("brezin"), root("schem")]);
  }

  if (slugAndName.includes("telefonspyn")) {
    return hasAny(normalizedText, [/\btelefonspyn/, /\bdomofon/, /\bduru skamb/]);
  }

  if (slugAndName.includes("terasu") || slugAndName.includes("teras")) {
    return hasAny(normalizedText, [/\bteras/]);
  }

  return true;
}

export function categoryMatchesRequestIntent(
  candidate: CategorySelectionCandidate,
  text: string,
  rootSignal?: RootSignal,
): boolean {
  const normalizedText = normalize(text);
  if (!normalizedText) return false;
  const intent = inferRequestIntent(normalizedText);
  const domains = candidateDomains(candidate);

  // A genuine cross-domain conflict (plumbing request vs. a kitchen-furniture
  // category) stays a hard reject — shared context words must not rescue it.
  if (intent.domains.size > 0 && domains.size > 0 && !intersects(intent.domains, domains)) {
    return false;
  }

  if (!passesActionGate(candidate, normalizedText)) return false;

  // A literal name match is the strongest signal we have, so it is checked BEFORE
  // the "intent has a domain but this candidate is untagged" reject below. An
  // incomplete candidate-domain regex (e.g. "Vandentiekio įrengimas" historically
  // not recognised as plumbing) must not drop a category the text names outright.
  if (hasSpecificNameEvidence(candidate, normalizedText)) return true;

  // No literal evidence and the request is clearly in a known domain this
  // candidate matched none of → treat it as off-topic.
  if (intent.domains.size > 0 && domains.size === 0) {
    return false;
  }

  // Data-driven taxonomy signal: only for requests OUTSIDE the hand-tuned domains
  // (those stay authoritative). When the request's distinctive words point at one
  // CONFIDENT taxonomy root and this candidate lives under that same root, keep it
  // even without a literal name hit — this recovers synonym/morphology misses for
  // the vocabulary-rich requests the index can classify. The confidence gate (see
  // inferRequestRoots) abstains on the sparse/ambiguous majority, so it never
  // over-accepts off-root noise. See docs/ai-routing/ (Gap 4).
  if (
    intent.domains.size === 0 &&
    rootSignal?.dominantRoot &&
    (candidate.rootId ?? candidate.id) === rootSignal.dominantRoot
  ) {
    return true;
  }

  if (intersects(intent.domains, domains)) {
    if (domains.has("plumbing") && intent.hasRepairAction) return true;
    if (domains.has("electrical") && (intent.hasRepairAction || intent.hasInstallAction)) return true;
    if (domains.has("access_security") && intent.hasInstallAction) return true;
    if (domains.has("terrace") && intent.hasBuildAction) return true;
    if (domains.has("kitchen_furniture") && (intent.hasBuildAction || intent.hasDesignAction)) return true;
  }

  return false;
}

function isAncestorOf(
  maybeAncestor: CategorySelectionCandidate,
  maybeChild: CategorySelectionCandidate,
  byId: Map<string, CategorySelectionCandidate>,
): boolean {
  let current = maybeChild.parentId ? byId.get(maybeChild.parentId) : undefined;
  while (current) {
    if (current.id === maybeAncestor.id) return true;
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return false;
}

export function filterRequestCategoryChoices<T>(
  choices: T[],
  text: string,
  getCandidate: (choice: T) => CategorySelectionCandidate,
  rootSignal?: RootSignal,
): T[] {
  const evidenceFiltered = choices.filter((choice) =>
    categoryMatchesRequestIntent(getCandidate(choice), text, rootSignal),
  );
  const byId = new Map(evidenceFiltered.map((choice) => {
    const candidate = getCandidate(choice);
    return [candidate.id, candidate] as const;
  }));

  const withoutAncestors = evidenceFiltered.filter((choice) => {
    const candidate = getCandidate(choice);
    return !evidenceFiltered.some((other) => {
      const otherCandidate = getCandidate(other);
      return otherCandidate.id !== candidate.id && isAncestorOf(candidate, otherCandidate, byId);
    });
  });

  const seenNames = new Set<string>();
  const deduped: T[] = [];
  for (const choice of withoutAncestors) {
    const key = normalize(getCandidate(choice).name);
    if (seenNames.has(key)) continue;
    seenNames.add(key);
    deduped.push(choice);
  }

  return deduped;
}

// ── Data-driven taxonomy domain signal (Gap 4) ────────────────────────────────
// The 11 hand-tuned ServiceDomains above stay authoritative for the construction-
// adjacent cases they were tuned for. This layer GENERALISES domain awareness to
// every taxonomy root by mining distinctive keywords from the category names
// themselves — no per-category maintenance. It is deliberately conservative: it
// only ACCEPTS a same-root candidate (recall), only for requests outside the hand-
// tuned domains, and only when the root signal is CONFIDENT — abstaining on the
// sparse/ambiguous majority so it can never over-reject. See docs/ai-routing/.

/** A taxonomy row reduced to what the domain index needs. */
export interface DomainIndexCategory {
  id: string;
  name: string;
  rootId?: string | null;
  aliases?: string[];
}

export interface DomainIndex {
  /** distinctive stem → the set of roots it points at (only stems in ≤ maxRoots roots). */
  tokenToRoots: Map<string, Set<string>>;
}

export interface RootSignal {
  /** rootId → number of distinct distinctive request tokens pointing at it. */
  rootHits: Map<string, number>;
  /** the single confidently-dominant root, or null when the signal is ambiguous/sparse. */
  dominantRoot: string | null;
}

// A stem pointing at more roots than this is too generic to be a domain signal
// ("montavimas", "paslaugos"); such stems are dropped from the index entirely.
const DOMAIN_MAX_ROOTS_PER_TOKEN = 2;
// A dominant root needs both enough absolute evidence and a clear lead, otherwise
// inferRequestRoots abstains (dominantRoot = null) and the caller falls back to
// literal-evidence behaviour. Tuned on the live taxonomy: lower values let
// incidental single-token collisions (e.g. a stray "Sveikata" hit) win.
const ROOT_MIN_HITS = 2;
const ROOT_MIN_MARGIN = 2;

/**
 * Build the keyword→root index from the taxonomy. Pure and deterministic; safe to
 * call per request (it is O(total category name tokens)).
 */
export function buildDomainIndex(
  categories: DomainIndexCategory[],
  maxRootsPerToken: number = DOMAIN_MAX_ROOTS_PER_TOKEN,
): DomainIndex {
  const all = new Map<string, Set<string>>();
  for (const category of categories) {
    const rootId = category.rootId ?? category.id;
    const source = [category.name, ...(category.aliases ?? [])].join(" ");
    for (const token of tokenize(source)) {
      if (GENERIC_CATEGORY_TOKENS.has(token) || CONTEXT_ONLY_TOKENS.has(token)) continue;
      const tokenStem = stem(token);
      if (tokenStem.length < 4) continue;
      let roots = all.get(tokenStem);
      if (!roots) {
        roots = new Set<string>();
        all.set(tokenStem, roots);
      }
      roots.add(rootId);
    }
  }
  const tokenToRoots = new Map<string, Set<string>>();
  for (const [tokenStem, roots] of all) {
    if (roots.size <= maxRootsPerToken) tokenToRoots.set(tokenStem, roots);
  }
  return { tokenToRoots };
}

/**
 * Infer which taxonomy root a request points at, with a confidence gate. Returns
 * the raw per-root hit counts plus a single `dominantRoot` only when one root has
 * both ≥ ROOT_MIN_HITS hits and a ≥ ROOT_MIN_MARGIN lead over the runner-up;
 * otherwise `dominantRoot` is null (abstain).
 */
export function inferRequestRoots(text: string, index: DomainIndex): RootSignal {
  const rootHits = new Map<string, number>();
  const seenStems = new Set<string>();
  for (const token of tokenize(text)) {
    const tokenStem = stem(token);
    if (seenStems.has(tokenStem)) continue;
    seenStems.add(tokenStem);
    const roots = index.tokenToRoots.get(tokenStem);
    if (!roots) continue;
    for (const root of roots) rootHits.set(root, (rootHits.get(root) ?? 0) + 1);
  }

  let topRoot: string | null = null;
  let top = 0;
  let second = 0;
  for (const [root, n] of rootHits) {
    if (n > top) {
      second = top;
      top = n;
      topRoot = root;
    } else if (n > second) {
      second = n;
    }
  }
  const dominantRoot =
    top >= ROOT_MIN_HITS && top - second >= ROOT_MIN_MARGIN ? topRoot : null;

  return { rootHits, dominantRoot };
}
