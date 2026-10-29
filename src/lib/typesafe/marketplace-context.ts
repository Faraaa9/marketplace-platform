import { activeCategoryFilter, expandToMatchSet } from "@/lib/category-matching";
import { suggestCategories } from "@/lib/category-suggestions";
import { prisma } from "@/lib/prisma";
import type { MarketplaceIntelligenceInput } from "./marketplace-intelligence";

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
  const categories = categoryResult.suggestions.map((suggestion) => ({
    id: suggestion.id,
    name: suggestion.name,
    breadcrumb: suggestion.breadcrumb,
    deterministicConfidence: suggestion.confidence,
  }));
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

