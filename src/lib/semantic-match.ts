type WeightedPart = {
  text?: string | null;
  weight: number;
};

export interface SemanticProviderInput {
  headline?: string | null;
  description?: string | null;
  services?: string | null;
  primaryService?: string | null;
  specializations?: string[] | null;
  categories?: string[] | null;
}

export interface SemanticRequestInput {
  title: string;
  description: string;
  budget?: string | null;
  deadline?: string | null;
  categoryName?: string | null;
}

export interface SemanticMatchResult {
  score: number;
  sharedTerms: string[];
  providerTermCount: number;
  requestTermCount: number;
}

const STOPWORDS = new Set([
  "apie",
  "arba",
  "atrodo",
  "bent",
  "bet",
  "bus",
  "cia",
  "dar",
  "del",
  "esu",
  "gal",
  "iki",
  "ir",
  "is",
  "jis",
  "jog",
  "kad",
  "kaip",
  "kas",
  "kur",
  "labai",
  "man",
  "mes",
  "nes",
  "nuo",
  "per",
  "prie",
  "reikia",
  "su",
  "tas",
  "tai",
  "ten",
  "turi",
  "uz",
  "yra",
  "vis",
  "visa",
  "visas",
  "viska",
]);

const LITHUANIAN_CHARS: Record<string, string> = {
  ą: "a",
  č: "c",
  ę: "e",
  ė: "e",
  į: "i",
  š: "s",
  ų: "u",
  ū: "u",
  ž: "z",
};

function normalizeTerm(input: string): string {
  return input
    .toLowerCase()
    .replace(/[ąčęėįšųūž]/g, (char) => LITHUANIAN_CHARS[char] ?? char)
    .replace(/[^a-z0-9]+/g, "");
}

function lightStem(term: string): string {
  const endings = [
    "iomis",
    "iams",
    "uose",
    "imas",
    "ymas",
    "iui",
    "iai",
    "iu",
    "ais",
    "ios",
    "ose",
    "ams",
    "oma",
    "imas",
    "us",
    "as",
    "is",
    "ys",
    "ai",
    "os",
    "es",
    "ti",
  ];
  for (const ending of endings) {
    if (term.length > ending.length + 3 && term.endsWith(ending)) {
      return term.slice(0, -ending.length);
    }
  }
  return term;
}

function addWeightedTerms(map: Map<string, number>, part: WeightedPart) {
  if (!part.text) return;
  const rawTerms = part.text
    .split(/[\s,.;:!?()[\]{}"'`/\\|+-]+/)
    .map(normalizeTerm)
    .filter((term) => term.length >= 3 && !STOPWORDS.has(term))
    .map(lightStem)
    .filter((term) => term.length >= 3 && !STOPWORDS.has(term));

  for (const term of rawTerms) {
    map.set(term, (map.get(term) ?? 0) + part.weight);
  }
}

function buildVector(parts: WeightedPart[]): Map<string, number> {
  const vector = new Map<string, number>();
  for (const part of parts) addWeightedTerms(vector, part);
  return vector;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (const value of a.values()) normA += value * value;
  for (const value of b.values()) normB += value * value;
  if (normA === 0 || normB === 0) return 0;

  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [term, value] of small) {
    dot += value * (large.get(term) ?? 0);
  }

  return dot / Math.sqrt(normA * normB);
}

function topSharedTerms(a: Map<string, number>, b: Map<string, number>): string[] {
  const shared: Array<{ term: string; weight: number }> = [];
  for (const [term, providerWeight] of a) {
    const requestWeight = b.get(term);
    if (!requestWeight) continue;
    shared.push({ term, weight: providerWeight * requestWeight });
  }
  return shared
    .sort((left, right) => right.weight - left.weight || left.term.localeCompare(right.term))
    .slice(0, 6)
    .map((item) => item.term);
}

export function calculateSemanticMatch(
  provider: SemanticProviderInput,
  request: SemanticRequestInput,
): SemanticMatchResult {
  const providerVector = buildVector([
    { text: provider.primaryService, weight: 3 },
    { text: provider.headline, weight: 2 },
    { text: provider.services, weight: 2 },
    { text: provider.specializations?.join(" "), weight: 2 },
    { text: provider.categories?.join(" "), weight: 1.5 },
    { text: provider.description, weight: 1 },
  ]);
  const requestVector = buildVector([
    { text: request.title, weight: 3 },
    { text: request.categoryName, weight: 1.5 },
    { text: request.description, weight: 1 },
    { text: request.budget, weight: 0.4 },
    { text: request.deadline, weight: 0.4 },
  ]);

  const similarity = cosineSimilarity(providerVector, requestVector);
  const sharedTerms = topSharedTerms(providerVector, requestVector);
  const sharedBoost = Math.min(sharedTerms.length * 2, 10);

  return {
    score: Math.min(100, Math.round(similarity * 100 + sharedBoost)),
    sharedTerms,
    providerTermCount: providerVector.size,
    requestTermCount: requestVector.size,
  };
}

export function summarizeSemanticScores(scores: number[]) {
  if (scores.length === 0) {
    return { avgScore: 0, topScore: 0, strongMatches: 0 };
  }

  const total = scores.reduce((sum, score) => sum + score, 0);
  return {
    avgScore: Math.round(total / scores.length),
    topScore: Math.max(...scores),
    strongMatches: scores.filter((score) => score >= 45).length,
  };
}
