/**
 * Category Intelligence — phrase-based REVIEW + CONFIDENCE signal (shadow only).
 *
 * TypeScript port of the validated offline adapter
 * (`scripts/ai-routing/category_intelligence_adapter.py`) restricted to the
 * SHIPPED configuration from the shadow evaluation
 * (`data/routing/category-intelligence/evaluation/category_intelligence_eval_report.md`,
 * recommendation: SAFE_TO_INTEGRATE_WITH_LIMITS):
 *
 *   - The signal NEVER selects or re-ranks categories. Selection stays on the
 *     production router. (The re-rank experiment was net-negative on gold:
 *     umbrella categories out-boost the correct specific trade.)
 *   - It only (a) raises confidence when a strong/medium phrase AGREES with the
 *     router's own top category, and (b) caps confidence + flags manual review
 *     on ambiguity / redirect signals.
 *   - Ambiguous phrases are never a positive selector — review trigger only.
 *
 * Matching is a faithful mirror of the Python analysis normalization
 * (`analyze_category_phrases.py` in the KATEGORIJOS project): same folding,
 * same 2–5 word n-gram filter, same stopword/junk lists — so phrases hit the
 * same dataset keys. The phrase brain is the compact artifact
 * `./data/phrase-brain.v1.json` built by
 * `scripts/ai-routing/build_phrase_brain_compact.py`.
 *
 * Pure + deterministic: no DB, no network, no env. Consumed ONLY by the shadow
 * routing path (`shadow.ts`) — never by live provider notifications, lead
 * visibility, or payments.
 */

import { fold } from "./multi-routing-v4";
import brainJson from "./data/phrase-brain.v1.json";

export const CATEGORY_INTELLIGENCE_VERSION = "category-intelligence-v1";

// --------------------------------------------------------------------------
// Scoring configuration — mirrors the validated SCORING block of the Python
// adapter. Do not change without re-running the offline shadow evaluation.
// --------------------------------------------------------------------------
export const CI_SCORING = {
  strongMinShare: 0.85,
  strongBoost: 0.18,
  mediumBoost: 0.06,
  ambiguousShareFloor: 0.1,
  ambiguousTopK: 3,
  redirectSuppress: 0.15,
  redirectBoost: 0.12,
  maxBoostPerCategory: 0.25,
  /** A review-flagged decision can never carry confidence above this. */
  reviewConfidenceCap: 0.6,
} as const;

// --------------------------------------------------------------------------
// Lithuanian text helpers — mirror of analyze_category_phrases.py.
// --------------------------------------------------------------------------
const NORM_RX = /[^0-9a-ząčęėįšųūž\s]/g;
const WS_RX = /\s+/g;

export function normalizeText(s: unknown): string {
  const str = (s == null ? "" : String(s)).toLowerCase();
  return str.replace(NORM_RX, " ").replace(WS_RX, " ").trim();
}

const NGRAM_SIZES = [2, 3, 4, 5];
const MIN_TOKEN_LEN = 3;

function foldedSet(words: string): Set<string> {
  return new Set(words.split(/\s+/).filter(Boolean).map((w) => fold(w)));
}

const STOPWORDS = foldedSet(`
ir bei ar arba o bet kad kaip kai jei jeigu tai yra būti nėra reikia reikalinga
reikalingas reikalingi reikalinga noriu norėčiau ieškau ieškome domina prašau
prašome sveiki labas laba diena dieną aš mes jūs jūsų mano mūsų savo su be iš į
iki nuo per po prie už apie taip ne nei gal galima galite galėtumėte kiek kaina
kainos kainą kainuoja kainuotų kuris kuri kurie kurią tas ta to tą bus turi turiu
turime labai daug mažiau daugiau tik jau dar viso visa visas tiek tada čia ten
man jam jai mums jiems kas ką dėl ant tarp prie pas net gi taigi nes todėl
`);

const GEO_WORDS = foldedSet(`
vilnius vilniaus vilniuje kaunas kauno kaune klaipėda klaipėdos klaipėdoje
šiauliai šiaulių šiauliuose panevėžys panevėžio panevėžyje alytus alytaus
marijampolė mažeikiai utena telšiai tauragė ukmergė visaginas plungė kretinga
raj rajonas rajone rajoną rajonai mieste miestas miestą mst apylinkėse vieta
vieta vietoje adresas adresu
`);

const FILLER_WORDS = foldedSet(`
pasiūlymų pasiūlymą pasiūlymas pasiūlymai pasiūlyti pasiūlymus kainomis kainą
skubiai skubiau greičiau greitai metu šiuo šiandien gerai būtų galėtų galėtumėte
galima atlikti atlikti kokia koks kokios kokie kokį reikėtų norėtume galėtume
lauksiu laukiu domina kreiptis suteikti paslauga paslaugos paslaugą darbus
darbai darbų darbas variantą variantai galimybę galimybės informaciją informacija
klausimas klausimai sąmatą sąmata pasakyti parašyti susisiekti atsakyti
pridedu nuotraukas nuotrauką nuotraukos savaitę savaitės savaitgalį bendras
plotas planuoju reikalinga reikalingas šiandien rytoj
`);

const NONSIGNAL = new Set<string>([...STOPWORDS, ...GEO_WORDS, ...FILLER_WORDS]);

const JUNK_FOLDED = new Set(
  [
    "kiek kainuotu", "kiek kainuoja", "kiek kainuos", "domina kaina",
    "kokia kaina", "kokia butu kaina", "laba diena", "labas vakaras",
    "ieskau meistro", "reikalingas meistras", "reikalinga pagalba",
    "kreiptis telefonu", "del kainos", "kaina kada", "kada galetumete",
    "aciu uz", "is anksto aciu", "geros dienos",
  ].map((p) => fold(p)),
);
const JUNK_RX = /\b(tel|telefonu|nr|el pastas|gmail|http|https|www|@)\b/;

function isJunkPhrase(foldedPhrase: string): boolean {
  return JUNK_FOLDED.has(foldedPhrase) || JUNK_RX.test(foldedPhrase);
}

/** Combine title+description exactly like the Python analysis did. */
export function requestText(title: unknown, description: unknown): string {
  const t = (title == null ? "" : String(title)).trim();
  const d = (description == null ? "" : String(description)).trim();
  if (t && d && fold(d).startsWith(fold(t))) return normalizeText(d);
  if (t && d) return normalizeText(`${t}. ${d}`);
  return normalizeText(t || d);
}

/** Distinct folded 2–5 word n-grams worth scoring — same filter as Python. */
export function phrasesIn(normalizedText: string): Set<string> {
  const toks = normalizedText.split(" ").filter(Boolean);
  const out = new Set<string>();
  const nTok = toks.length;
  for (const n of NGRAM_SIZES) {
    for (let i = 0; i + n <= nTok; i++) {
      const g = toks.slice(i, i + n);
      const first = g[0];
      const last = g[n - 1];
      if (first.length < MIN_TOKEN_LEN || last.length < MIN_TOKEN_LEN) continue;
      if (NONSIGNAL.has(fold(first)) || NONSIGNAL.has(fold(last))) continue;
      if (g.every((w) => NONSIGNAL.has(fold(w)))) continue;
      if (!g.some((w) => w.length >= 4 && !NONSIGNAL.has(fold(w)))) continue;
      const folded = fold(g.join(" "));
      if (isJunkPhrase(folded)) continue;
      out.add(folded);
    }
  }
  return out;
}

// --------------------------------------------------------------------------
// Curated redirect lexicon — mirror of the Python adapter (incl. the heating
// additions: katilas/šildymas must not collapse into generic Santechnika).
// token (folded substring in the request text) -> better target category,
// keyed by the category the token tends to be wrongly attached to.
// --------------------------------------------------------------------------
const REDIRECT_LEXICON: Record<string, Record<string, string>> = {
  "Santechnikai, santechnikos darbai": {
    lietvamzdis: "Stogdengiai, stogo darbai",
    latakas: "Stogdengiai, stogo darbai",
    latakai: "Stogdengiai, stogo darbai",
    stogas: "Stogdengiai, stogo darbai",
    radiatorius: "Katilų montavimas, remontas",
    radiatoriai: "Katilų montavimas, remontas",
    katilas: "Katilų montavimas, remontas",
    katilo: "Katilų montavimas, remontas",
    katila: "Katilų montavimas, remontas",
    sildymas: "Katilų montavimas, remontas",
    rekuperatorius: "Ventiliacija, vėdinimo sistemos",
    vedinimas: "Ventiliacija, vėdinimo sistemos",
  },
  "Stogdengiai, stogo darbai": {
    kanalizacija: "Santechnikai, santechnikos darbai",
    vamzdis: "Santechnikai, santechnikos darbai",
  },
  "Elektrikai, elektros darbai": {
    rekuperatorius: "Ventiliacija, vėdinimo sistemos",
    radiatorius: "Katilų montavimas, remontas",
  },
};

// --------------------------------------------------------------------------
// Compact phrase brain (built by scripts/ai-routing/build_phrase_brain_compact.py)
// --------------------------------------------------------------------------
const STRENGTHS = ["strong", "medium", "ambiguous", "weak"] as const;
export type PhraseStrength = (typeof STRENGTHS)[number];

/** [strengthCode, topCatIdx, topShare*10000, totalCount, distFlat[catIdx, share*10000 ...]] */
type CompactPhrase = [number, number, number, number, number[]];

interface CompactBrain {
  version: string;
  cats: string[];
  phrases: Record<string, CompactPhrase>;
}

const brain = brainJson as unknown as CompactBrain;

export interface MatchedPhrase {
  phrase: string;
  strength: PhraseStrength;
  topCategory: string;
  topCategoryShare: number;
  totalCount: number;
}

export interface CategoryIntelligenceSignal {
  version: string;
  matchedPhrases: MatchedPhrase[];
  /**
   * Strong/medium/redirect boosts (capped). NOT used to select or re-rank —
   * only to lift confidence when the router's own pick agrees.
   */
  rankingBoosts: Record<string, number>;
  ambiguitySignals: Array<{ phrase: string; categories: string[] }>;
  redirectHints: Array<{ token: string; from: string; to: string }>;
  explanation: string;
}

const round4 = (v: number) => Math.round(v * 10000) / 10000;

/** Analyze a request's text against the phrase brain. Pure, no I/O. */
export function analyzeCategoryIntelligence(
  title: unknown,
  description: unknown,
): CategoryIntelligenceSignal {
  const cfg = CI_SCORING;
  const text = requestText(title, description);

  const matched: Array<{ phrase: string; rec: CompactPhrase }> = [];
  for (const phrase of phrasesIn(text)) {
    const rec = brain.phrases[phrase];
    if (rec) matched.push({ phrase, rec });
  }
  // Most-evidenced phrase first (the explanation leads with it).
  matched.sort((a, b) => b.rec[3] - a.rec[3]);

  const boosts = new Map<string, number>();
  const addBoost = (cat: string, amount: number) =>
    boosts.set(cat, (boosts.get(cat) ?? 0) + amount);

  const matchedPhrases: MatchedPhrase[] = [];
  const ambiguitySignals: CategoryIntelligenceSignal["ambiguitySignals"] = [];
  const inPlay = new Set<string>();

  for (const { phrase, rec } of matched) {
    const [strengthCode, topIdx, topShare10k, totalCount, distFlat] = rec;
    const strength = STRENGTHS[strengthCode];
    const topCategory = brain.cats[topIdx];
    const topShare = topShare10k / 10000;
    matchedPhrases.push({
      phrase,
      strength,
      topCategory,
      topCategoryShare: topShare,
      totalCount,
    });
    inPlay.add(topCategory);

    if (strength === "strong" && topShare >= cfg.strongMinShare) {
      addBoost(topCategory, cfg.strongBoost);
    } else if (strength === "medium") {
      addBoost(topCategory, cfg.mediumBoost);
    } else if (strength === "ambiguous") {
      // Review signal only — ambiguous phrases never receive ranking weight.
      const catsHere: string[] = [];
      for (let i = 0; i + 1 < distFlat.length; i += 2) {
        const share = distFlat[i + 1] / 10000;
        if (share >= cfg.ambiguousShareFloor) {
          const cat = brain.cats[distFlat[i]];
          catsHere.push(cat);
          inPlay.add(cat);
        }
      }
      if (catsHere.length >= 2) {
        ambiguitySignals.push({ phrase, categories: catsHere });
      }
    }
    // weak -> ignored
  }

  // Redirect hints: corrective, only when the token is literally present AND
  // the over-claimed category is already in play. The target is never injected
  // into routing — in the shipped config a hint only gates the row to review.
  const redirectHints: CategoryIntelligenceSignal["redirectHints"] = [];
  for (const [fromCat, mapping] of Object.entries(REDIRECT_LEXICON)) {
    if (!inPlay.has(fromCat) && !boosts.has(fromCat)) continue;
    for (const [token, toCat] of Object.entries(mapping)) {
      const rx = new RegExp(`\\b${fold(token)}\\b`);
      if (rx.test(fold(text))) {
        addBoost(fromCat, -cfg.redirectSuppress);
        addBoost(toCat, cfg.redirectBoost);
        redirectHints.push({ token, from: fromCat, to: toCat });
      }
    }
  }

  const cap = cfg.maxBoostPerCategory;
  const rankingBoosts: Record<string, number> = {};
  for (const [cat, v] of boosts) {
    if (Math.abs(v) < 1e-9) continue;
    rankingBoosts[cat] = round4(Math.max(-cap, Math.min(cap, v)));
  }

  let explanation = "No intelligence phrases matched.";
  if (matchedPhrases.length > 0) {
    const lead = matchedPhrases[0];
    explanation =
      `Matched ${matchedPhrases.length} phrase(s); ` +
      `top '${lead.phrase}' (${lead.strength}) -> ${lead.topCategory}.`;
  }

  return {
    version: CATEGORY_INTELLIGENCE_VERSION,
    matchedPhrases,
    rankingBoosts,
    ambiguitySignals,
    redirectHints,
    explanation,
  };
}

// --------------------------------------------------------------------------
// Router-aware combination — the exact decision logic validated by the shadow
// evaluation's shipped config (evaluate_category_intelligence_shadow.score_row).
// --------------------------------------------------------------------------

// Folded taxonomy-variant aliases (mirror of the evaluator's _SAFE_ALIASES) so
// honest spelling variants of the same provider node compare as equal.
const SAFE_ALIASES: Record<string, string> = {
  "fasado dazymas": "fasado dazymas, remontas",
  "fasado remontas": "fasado dazymas, remontas",
  "silumos siurbliu montavimas": "silumos siurbliu montavimas, remontas",
  "silumos siurbliu remontas": "silumos siurbliu montavimas, remontas",
  "lietaus nuoteku tinklu montavimas": "lietaus nuvedimo sistemos",
  "siuksliu isvezimas: statybiniu ir kt.": "statybiniu atlieku isvezimas",
  "siuksliu isvezimas statybiniu ir kt.": "statybiniu atlieku isvezimas",
  "siuksliu isvezimas: statybiniu ir kt": "statybiniu atlieku isvezimas",
};

function canon(name: string): string {
  const f = fold(name);
  return SAFE_ALIASES[f] ?? f;
}

export interface CombinedIntelligenceDecision {
  /** Should this routing decision go to manual review? */
  shouldReview: boolean;
  /** Routing confidence after the intelligence nudge/cap (0..1, 2 decimals). */
  confidence: number;
  /** Human-readable reasons the review flag fired (empty when it didn't). */
  reviewReasons: string[];
}

/**
 * Combine the pure phrase signal with the router's OWN decision. Selection is
 * never touched: this returns only a review flag + adjusted confidence.
 *
 *  - redirect hint fired                                      -> review
 *  - ambiguous phrase AND (router's top category is OUTSIDE the phrase's
 *    distribution, or the router is itself not confident)     -> review
 *  - a strong/medium phrase AGREEING with the router's top    -> confidence up
 *  - any review trigger caps confidence at CI_SCORING.reviewConfidenceCap
 */
export function combineWithRouting(
  signal: CategoryIntelligenceSignal,
  routerTopCategoryName: string | null,
  baseConfidence: number,
): CombinedIntelligenceDecision {
  const cap = CI_SCORING.reviewConfidenceCap;
  const topCanon = routerTopCategoryName ? canon(routerTopCategoryName) : null;

  const ambCats = new Set<string>();
  for (const a of signal.ambiguitySignals) {
    for (const c of a.categories) ambCats.add(canon(c));
  }
  const routerInDist = topCanon != null && ambCats.has(topCanon);
  const ambiguityReview =
    signal.ambiguitySignals.length > 0 && (!routerInDist || baseConfidence < cap);
  const redirectReview = signal.redirectHints.length > 0;
  const shouldReview = redirectReview || ambiguityReview;

  const reviewReasons: string[] = [];
  if (ambiguityReview) {
    reviewReasons.push(
      "ambiguous phrase(s): " +
        signal.ambiguitySignals.map((a) => `'${a.phrase}'`).join(", "),
    );
  }
  if (redirectReview) {
    reviewReasons.push(
      "redirect hint(s): " +
        signal.redirectHints.map((h) => `'${h.token}'->${h.to}`).join(", "),
    );
  }

  // Only an AGREEING positive boost lifts confidence (never a re-rank).
  let confirm = 0;
  if (topCanon != null) {
    for (const [cat, v] of Object.entries(signal.rankingBoosts)) {
      if (canon(cat) === topCanon) confirm += v;
    }
  }
  confirm = Math.max(0, confirm);

  let confidence = Math.max(0, Math.min(1, baseConfidence + confirm));
  if (shouldReview) confidence = Math.min(confidence, cap);
  confidence = Math.round(confidence * 100) / 100;

  return { shouldReview, confidence, reviewReasons };
}
