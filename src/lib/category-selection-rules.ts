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
]);

function hasSpecificNameEvidence(candidate: CategorySelectionCandidate, text: string): boolean {
  const textTokens = tokenize(text);
  const textStems = new Set(textTokens.map(stem));
  const specificNameTokens = tokenize(candidate.name).filter(
    (token) => !GENERIC_CATEGORY_TOKENS.has(token) && !CONTEXT_ONLY_TOKENS.has(token),
  );

  return specificNameTokens.some((token) => {
    const tokenStem = stem(token);
    return (
      textTokens.includes(token) ||
      (tokenStem.length >= 4 && textStems.has(tokenStem)) ||
      textTokens.some((textToken) => textToken.includes(token) || token.includes(textToken))
    );
  });
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
): T[] {
  const evidenceFiltered = choices.filter((choice) =>
    categoryMatchesRequestIntent(getCandidate(choice), text),
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
