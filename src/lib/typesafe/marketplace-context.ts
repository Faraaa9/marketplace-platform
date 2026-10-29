import { activeCategoryFilter, expandToMatchSet } from "@/lib/category-matching";
import { denseTopK, embedTexts } from "@/lib/category-dense";
import { suggestCategories } from "@/lib/category-suggestions";
import { prisma } from "@/lib/prisma";
import type { JevCategoryCandidate, MarketplaceIntelligenceInput } from "./marketplace-intelligence";

const DENSE_POOL = 12;

async function denseCandidates(text: string, exclude: Set<string>): Promise<JevCategoryCandidate[]> {
  try {
    const [vector] = await embedTexts([text.slice(0, 2000)]);
    const hits = (await denseTopK(vector, DENSE_POOL)).filter((hit) => !exclude.has(hit.categoryId));
    if (hits.length === 0) return [];
    const rows = await prisma.category.findMany({
      where: { id: { in: hits.map((hit) => hit.categoryId) }, isActive: true },
      select: { id: true, name: true, parent: { select: { name: true, parent: { select: { name: true } } } } },
    });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return hits.flatMap((hit) => {
      const row = byId.get(hit.categoryId);
      if (!row) return [];
      const breadcrumb = [row.parent?.parent?.name, row.parent?.name, row.name].filter((n): n is string => Boolean(n));
      // ponytail: no lexical score for dense hits; only the no-key demo fallback reads it
      return [{ id: row.id, name: row.name, breadcrumb, deterministicConfidence: 0 }];
    });
  } catch (error) {
    // Embeddings or pgvector down: lexical candidates still work.
    console.error("[typesafe] dense candidates failed:", error);
    return [];
  }
}

export async function prepareMarketplaceContext(input: {
  text: string;
  city: string;
}): Promise<MarketplaceIntelligenceInput> {
  const categoryResult = await suggestCategories({
    mode: "request",
    text: input.text,
    limit: 8,
    useAiRerank: false,
  });
  const lexical = categoryResult.suggestions.map((suggestion) => ({
    id: suggestion.id,
    name: suggestion.name,
    breadcrumb: suggestion.breadcrumb,
    deterministicConfidence: suggestion.confidence,
  }));
  // Lexical alone misses about half of real requests (benchmark 2026-10-29:
  // "butų valymas" got window manufacturing). Jev can only pick from what it is
  // shown, so widen the pool with the same pgvector retrieval the live
  // multi-label flow uses.
  const categories = [...lexical, ...(await denseCandidates(input.text, new Set(lexical.map((c) => c.id))))];
  const matchCategoryIds = await expandToMatchSet(categories.map((category) => category.id));
  const activeCategory = activeCategoryFilter();
  const providerRows = matchCategoryIds.length === 0
    ? []
    : await prisma.providerProfile.findMany({
        where: {
          isActive: true,
          moderationStatus: "APPROVED",
          categories: {
            some: { categoryId: { in: matchCategoryIds }, ...activeCategory },
          },
        },
        select: {
          id: true,
          displayName: true,
          headline: true,
          description: true,
          services: true,
          location: true,
          rating: true,
          reviewCount: true,
          categories: {
            where: activeCategory,
            select: { categoryId: true, category: { select: { name: true } } },
          },
        },
        orderBy: [{ rating: "desc" }, { reviewCount: "desc" }],
        take: 8,
      });

  return {
    text: input.text,
    city: input.city,
    categories,
    providers: providerRows.map((provider) => ({
      id: provider.id,
      name: provider.displayName || provider.headline || "Tiekėjas",
      headline: provider.headline,
      description: provider.description,
      services: provider.services,
      location: provider.location,
      rating: provider.rating,
      reviewCount: provider.reviewCount,
      categoryIds: provider.categories.map((category) => category.categoryId),
      categoryNames: provider.categories.map((category) => category.category.name),
    })),
  };
}

