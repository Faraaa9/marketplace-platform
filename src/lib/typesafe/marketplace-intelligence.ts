import {
  TypeSafeClient,
  choice,
  noul,
  score,
  type Questions,
} from "@typesafe-ai/sdk";

export const TYPESAFE_PROMPT_VERSION = "marketplace-jev-v2";
// Pinned because the policy thresholds below were set against this version;
// the jev-latest alias moves on release and would shift them silently.
export const TYPESAFE_PINNED_MODEL = "jev-1.14.0";

export interface JevCategoryCandidate {
  id: string;
  name: string;
  breadcrumb: string[];
  deterministicConfidence: number;
}

export interface JevProviderCandidate {
  id: string;
  name: string;
  headline: string | null;
  description: string | null;
  services: string | null;
  location: string | null;
  rating: number | null;
  reviewCount: number;
  categoryIds: string[];
  categoryNames: string[];
}

export interface MarketplaceIntelligenceInput {
  text: string;
  city: string;
  categories: JevCategoryCandidate[];
  providers: JevProviderCandidate[];
}

export type JevDecision = "auto" | "review" | "reject";

export interface CategoryJudgment {
  id: string;
  name: string;
  probability: number;
  selected: boolean;
  primary: boolean;
}

export interface ProviderJudgment {
  id: string;
  name: string;
  semanticScore: number;
  confidence: number;
  compositeScore: number;
  cityMatch: boolean;
  rating: number | null;
  reviewCount: number;
}

export interface MarketplaceIntelligenceResult {
  engine: "typesafe" | "demo";
  model: string;
  decision: JevDecision;
  decisionReason: string;
  primaryCategoryId: string | null;
  primaryCategoryName: string | null;
  primaryConfidence: number;
  categories: CategoryJudgment[];
  spamProbability: number;
  ambiguityProbability: number;
  urgencyProbability: number;
  missingDetailsProbability: number;
  providers: ProviderJudgment[];
  usage: { inputTokens: number; outputTokens: number } | null;
  latencyMs: number;
  fallbackReason?: "missing_key" | "api_error";
}

export interface DecisionPolicyInput {
  hasPrimaryCategory: boolean;
  primaryConfidence: number;
  spamProbability: number;
  ambiguityProbability: number;
}

export function applyDecisionPolicy(input: DecisionPolicyInput): {
  decision: JevDecision;
  reason: string;
} {
  if (input.spamProbability >= 0.85) {
    return { decision: "reject", reason: "Labai didelė šlamšto tikimybė" };
  }
  if (!input.hasPrimaryCategory) {
    return { decision: "review", reason: "Nerasta tinkama kategorija" };
  }
  if (input.primaryConfidence < 0.62) {
    return { decision: "review", reason: "Per mažas pagrindinės kategorijos užtikrintumas" };
  }
  if (input.ambiguityProbability >= 0.58) {
    return { decision: "review", reason: "Užklausa gali būti dviprasmiška" };
  }
  if (input.spamProbability >= 0.35) {
    return { decision: "review", reason: "Reikia patikrinti šlamšto riziką" };
  }
  if (
    input.primaryConfidence >= 0.78 &&
    input.ambiguityProbability <= 0.35 &&
    input.spamProbability <= 0.2
  ) {
    return { decision: "auto", reason: "Pakanka užtikrintumo automatiniam maršrutizavimui" };
  }
  return { decision: "review", reason: "Rezultatas yra ribinėje zonoje" };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function normalizeText(value: string): string {
  return value
    .toLocaleLowerCase("lt-LT")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function cityMatches(requestCity: string, providerLocation: string | null): boolean {
  const city = normalizeText(requestCity);
  if (!city || city === "visa lietuva") return true;
  const location = normalizeText(providerLocation ?? "");
  return location.includes(city) || city.includes(location) && location.length > 2;
}

export function rankProviderJudgments(
  providers: JevProviderCandidate[],
  semantic: Map<string, { score: number; confidence: number }>,
  city: string,
): ProviderJudgment[] {
  return providers
    .map((provider) => {
      const judged = semantic.get(provider.id) ?? { score: 0, confidence: 0 };
      const semanticScore = clamp01(judged.score / 3);
      const cityMatch = cityMatches(city, provider.location);
      const ratingScore = provider.rating == null ? 0.5 : clamp01(provider.rating / 5);
      const compositeScore = semanticScore * 0.8 + (cityMatch ? 1 : 0) * 0.12 + ratingScore * 0.08;
      return {
        id: provider.id,
        name: provider.name,
        semanticScore,
        confidence: clamp01(judged.confidence),
        compositeScore: clamp01(compositeScore),
        cityMatch,
        rating: provider.rating,
        reviewCount: provider.reviewCount,
      };
    })
    .filter((provider) => provider.semanticScore >= 0.35)
    .sort((a, b) => b.compositeScore - a.compositeScore);
}

function makeQuestions(input: MarketplaceIntelligenceInput): Questions {
  // Questions are in English (Jev's primary training language); the state
  // stays in the customer's Lithuanian so nothing is lost in translation.
  const categoryCriteria: Record<string, string> = { no_match: "None of the categories fits" };
  input.categories.forEach((category, index) => {
    categoryCriteria[`c${index}`] = `${category.name}; path: ${category.breadcrumb.join(" > ")}`;
  });

  const questions: Questions = {
    is_spam: noul("Is the Lithuanian customer text in `request.text` spam, advertising, gibberish, or unrelated to ordering a service?", {
      true: "The text is not a genuine service need",
      false: "The text describes a genuine service need",
    }),
    is_ambiguous: noul("Without clarification from a human, is it unclear which main job the customer is asking for?", {
      true: "Essential information is missing or several unrelated services are equally likely",
      false: "The main requested job is clear enough",
    }),
    is_urgent: noul("Does the customer need the job done urgently (today, within a day or two, or an emergency such as a leak or outage)?", {
      true: "The request states or clearly implies urgency",
      false: "No urgency is stated or implied",
    }),
    missing_details: noul("Would a provider need to ask the customer for key details before quoting (scope, size, quantity, address area or photos)?", {
      true: "A provider could not give a reasonable quote from this text alone",
      false: "The text has enough detail for a provider to quote",
    }),
  };

  if (input.categories.length > 0) {
    questions.primary_category = choice(
      "Choose the one category that best matches the job the customer is asking for. Choose no_match if none fits.",
      categoryCriteria,
    );
  }

  input.categories.forEach((category, index) => {
    questions[`category_fit_${index}`] = noul(
      `Does the requested job directly belong to the category "${category.name}" (\`category_candidates[${index}]\`)?`,
      {
        true: `The category "${category.name}" is directly needed to do the job`,
        false: `The category "${category.name}" is not directly needed or is only loosely related`,
      },
    );
  });

  input.providers.forEach((provider, index) => {
    questions[`provider_fit_${index}`] = score(
      `Rate how well the provider in \`provider_candidates[${index}]\` matches the specific job in \`request.text\`. Ignore city, rating and price.`,
      [
        "Services are unrelated to the customer's job",
        "There is a weak or indirect connection",
        "The provider can likely do the job",
        "The provider's specialisation matches the job very precisely",
      ] as const,
    );
  });

  return questions;
}

function noulValue(answer: unknown): number {
  return typeof answer === "object" && answer !== null && "type" in answer && answer.type === "noul" &&
    "noul" in answer && typeof answer.noul === "number"
    ? clamp01(answer.noul)
    : 0;
}

function choiceValue(answer: unknown): { choice: string; confidence: number; probabilities: Record<string, number> } {
  if (
    typeof answer === "object" && answer !== null && "type" in answer && answer.type === "choice" &&
    "choice" in answer && typeof answer.choice === "string" &&
    "confidence" in answer && typeof answer.confidence === "number" &&
    "probabilities" in answer && typeof answer.probabilities === "object" && answer.probabilities !== null
  ) {
    return {
      choice: answer.choice,
      confidence: clamp01(answer.confidence),
      probabilities: answer.probabilities as Record<string, number>,
    };
  }
  return { choice: "no_match", confidence: 0, probabilities: {} };
}

function scoreValue(answer: unknown): { score: number; confidence: number } {
  if (
    typeof answer === "object" && answer !== null && "type" in answer && answer.type === "score" &&
    "score" in answer && typeof answer.score === "number" &&
    "confidence" in answer && typeof answer.confidence === "number"
  ) {
    return { score: answer.score, confidence: clamp01(answer.confidence) };
  }
  return { score: 0, confidence: 0 };
}

function demoResult(
  input: MarketplaceIntelligenceInput,
  started: number,
  reason: "missing_key" | "api_error",
): MarketplaceIntelligenceResult {
  const sortedCategories = [...input.categories].sort(
    (a, b) => b.deterministicConfidence - a.deterministicConfidence,
  );
  const primary = sortedCategories[0] ?? null;
  const primaryConfidence = primary?.deterministicConfidence ?? 0;
  const categories = sortedCategories.map((category, index) => ({
    id: category.id,
    name: category.name,
    probability: clamp01(category.deterministicConfidence),
    selected: index < 3 && category.deterministicConfidence >= 0.62,
    primary: index === 0,
  }));
  const ambiguityProbability = sortedCategories.length > 1 &&
    Math.abs(sortedCategories[0].deterministicConfidence - sortedCategories[1].deterministicConfidence) < 0.12
    ? 0.65
    : 0.2;
  const spamProbability = input.text.trim().length < 12 ? 0.55 : 0.08;
  const policy = applyDecisionPolicy({
    hasPrimaryCategory: Boolean(primary),
    primaryConfidence,
    spamProbability,
    ambiguityProbability,
  });
  const semantic = new Map(
    input.providers.map((provider) => {
      const overlaps = provider.categoryIds.some((id) => categories.some((category) => category.selected && category.id === id));
      return [provider.id, { score: overlaps ? 2.2 : 1, confidence: 0.55 }] as const;
    }),
  );
  return {
    engine: "demo",
    model: "deterministic-demo",
    decision: policy.decision,
    decisionReason: policy.reason,
    primaryCategoryId: primary?.id ?? null,
    primaryCategoryName: primary?.name ?? null,
    primaryConfidence,
    categories,
    spamProbability,
    ambiguityProbability,
    // ponytail: demo has no signal for these; real values only from Jev
    urgencyProbability: 0,
    missingDetailsProbability: 0,
    providers: rankProviderJudgments(input.providers, semantic, input.city),
    usage: null,
    latencyMs: Date.now() - started,
    fallbackReason: reason,
  };
}

export async function evaluateMarketplaceRequest(
  input: MarketplaceIntelligenceInput,
): Promise<MarketplaceIntelligenceResult> {
  const started = Date.now();
  const apiKey = process.env.TYPESAFE_API_KEY?.trim();
  if (!apiKey) return demoResult(input, started, "missing_key");

  const questions = makeQuestions(input);
  try {
    const client = new TypeSafeClient({
      apiKey,
      defaultModel: process.env.TYPESAFE_DEFAULT_MODEL?.trim() || TYPESAFE_PINNED_MODEL,
      logLevel: "warn",
      timeout: 12_000,
    });
    const response = await client.systemOne(
      {
        state: {
          request: { text: input.text.slice(0, 4000), city: input.city.slice(0, 120) },
          category_candidates: input.categories.map((category, index) => ({
            option: `c${index}`,
            name: category.name,
            breadcrumb: category.breadcrumb,
          })),
          provider_candidates: input.providers.map((provider, index) => ({
            option: `p${index}`,
            name: provider.name,
            headline: provider.headline,
            description: provider.description?.slice(0, 700) ?? null,
            services: provider.services?.slice(0, 700) ?? null,
            location: provider.location,
            categories: provider.categoryNames,
          })),
        },
        questions,
      },
      { timeout: 12_000, retry: { maxRetries: 1 } },
    );

    const primaryAnswer = choiceValue(response.answers.primary_category);
    const primaryIndex = /^c\d+$/.test(primaryAnswer.choice)
      ? Number(primaryAnswer.choice.slice(1))
      : -1;
    const primary = input.categories[primaryIndex] ?? null;
    const categories = input.categories.map((category, index) => {
      const fit = noulValue(response.answers[`category_fit_${index}`]);
      return {
        id: category.id,
        name: category.name,
        probability: fit,
        selected: index === primaryIndex || fit >= 0.62,
        primary: index === primaryIndex,
      };
    });
    const selectedIds = new Set(
      categories
        .filter((category) => category.selected)
        .sort((a, b) => Number(b.primary) - Number(a.primary) || b.probability - a.probability)
        .slice(0, 3)
        .map((category) => category.id),
    );
    categories.forEach((category) => {
      category.selected = selectedIds.has(category.id);
    });

    const spamProbability = noulValue(response.answers.is_spam);
    const ambiguityProbability = noulValue(response.answers.is_ambiguous);
    const policy = applyDecisionPolicy({
      hasPrimaryCategory: Boolean(primary),
      primaryConfidence: primary ? primaryAnswer.confidence : 0,
      spamProbability,
      ambiguityProbability,
    });
    const semantic = new Map(
      input.providers.map((provider, index) => [
        provider.id,
        scoreValue(response.answers[`provider_fit_${index}`]),
      ]),
    );

    return {
      engine: "typesafe",
      model: response.model,
      decision: policy.decision,
      decisionReason: policy.reason,
      primaryCategoryId: primary?.id ?? null,
      primaryCategoryName: primary?.name ?? null,
      primaryConfidence: primary ? primaryAnswer.confidence : 0,
      categories: categories.sort((a, b) => Number(b.primary) - Number(a.primary) || b.probability - a.probability),
      spamProbability,
      ambiguityProbability,
      urgencyProbability: noulValue(response.answers.is_urgent),
      missingDetailsProbability: noulValue(response.answers.missing_details),
      providers: rankProviderJudgments(input.providers, semantic, input.city),
      usage: {
        inputTokens: response.usage.input_tokens ?? 0,
        outputTokens: response.usage.output_tokens ?? 0,
      },
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    console.error("[typesafe] Jev evaluation failed, using demo fallback:", error);
    return demoResult(input, started, "api_error");
  }
}
