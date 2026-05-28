import { NextRequest, NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveProvider } from "@/lib/provider-guard";
import { expandToMatchSet, activeCategoryFilter } from "@/lib/category-matching";
import { getUnlockedRequestIds } from "@/lib/credits";
import { recordAiRun } from "@/lib/ai/audit";
import { calculateSemanticMatch, summarizeSemanticScores } from "@/lib/semantic-match";

export async function GET(req: NextRequest) {
  await connection();
  try {
    const guard = await requireActiveProvider();
    if (!guard.authorized) return guard.response;

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const category = searchParams.get("category") || "";
    const location = searchParams.get("location") || "";
    const search = searchParams.get("search") || "";
    const sort = searchParams.get("sort") || "relevance";
    const perPage = 20;
    const semanticStarted = Date.now();

    // Load provider profile — curated categories drive matching + relevance.
    const profile = await prisma.providerProfile.findUnique({
      where: { userId: guard.userId },
      select: {
        id: true,
        headline: true,
        description: true,
        services: true,
        primaryService: true,
        specializations: true,
        location: true,
        categories: {
          where: activeCategoryFilter(),
          select: {
            categoryId: true,
            category: { select: { name: true } },
          },
        },
      },
    });

    const providerCategoryIds = profile?.categories.map((c) => c.categoryId) ?? [];
    const providerLocation = profile?.location || "";

    // The set of request categoryIds this provider can serve (tree-aware).
    const providerMatchSet = await expandToMatchSet(providerCategoryIds);

    // An explicit ?category= filter (curated slug) narrows to that branch.
    let filterIds = providerMatchSet;
    if (category) {
      const picked = await prisma.category.findUnique({
        where: { slug: category },
        select: { id: true },
      });
      filterIds = picked ? await expandToMatchSet([picked.id]) : [];
    }

    const where: Record<string, unknown> = {
      status: "OPEN",
      moderationStatus: "APPROVED",
      clientId: { not: guard.userId },
      categoryId: { in: filterIds },
    };
    // "Visa Lietuva" is the nationwide tag — as a filter it means "all
    // locations", and a specific city must also surface nationwide requests.
    if (location && location !== "Visa Lietuva") {
      where.location = { in: [location, "Visa Lietuva"] };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    // Hard limit to bound Node-side scoring/sorting work. With the lead-unlock
    // model providers see at most ~500 open leads at once — beyond that we'd
    // need DB-side scoring (CASE WHEN ordering + count() separately).
    const MAX_SCORED_LEADS = 500;

    // Run total count + paginated fetch in parallel.
    const [total, allRequests] = await Promise.all([
      prisma.serviceRequest.count({ where }),
      prisma.serviceRequest.findMany({
        where,
        select: {
          id: true,
          title: true,
          description: true,
          categoryId: true,
          categoryRef: { select: { id: true, name: true } },
          categories: {
            select: { categoryId: true, category: { select: { name: true } } },
            orderBy: { sortOrder: "asc" },
          },
          location: true,
          budget: true,
          deadline: true,
          status: true,
          createdAt: true,
          _count: { select: { responses: true } },
          responses: {
            where: { providerId: guard.userId },
            select: { id: true },
            take: 1,
          },
        },
        orderBy: { createdAt: "desc" },
        take: MAX_SCORED_LEADS,
      }),
    ]);

    // Score relevance + mark responded. Multi-cat: a request matches if ANY
    // of its category IDs is in the provider's match set.
    const providerMatch = new Set(providerMatchSet);
    const scored = allRequests.map((reqRow) => {
      let score = 0;
      const requestCategoryIds = reqRow.categories.length > 0
        ? reqRow.categories.map((link) => link.categoryId)
        : reqRow.categoryId
          ? [reqRow.categoryId]
          : [];
      if (requestCategoryIds.some((id) => providerMatch.has(id))) score += 2;
      if (
        reqRow.location === providerLocation ||
        reqRow.location === "Visa Lietuva" ||
        providerLocation === "Visa Lietuva"
      ) {
        score += 1;
      }
      const semantic = calculateSemanticMatch(
        {
          headline: profile?.headline,
          description: profile?.description,
          services: profile?.services,
          primaryService: profile?.primaryService,
          specializations: profile?.specializations,
          categories: profile?.categories.map((category) => category.category.name),
        },
        {
          title: reqRow.title,
          description: reqRow.description,
          budget: reqRow.budget,
          deadline: reqRow.deadline,
          categoryName: reqRow.categoryRef?.name,
        },
      );
      const { responses, categories, ...rest } = reqRow;
      const categoryNames = categories
        .map((link) => link.category?.name?.trim() ?? "")
        .filter((name) => name.length > 0);
      return {
        ...rest,
        categoryNames: categoryNames.length > 0
          ? categoryNames
          : reqRow.categoryRef?.name
            ? [reqRow.categoryRef.name]
            : [],
        relevance: score,
        semanticShadowScore: semantic.score,
        semanticShadowTerms: semantic.sharedTerms,
        hasResponded: responses.length > 0,
      };
    });

    const semanticSummary = summarizeSemanticScores(
      scored.map((request) => request.semanticShadowScore),
    );
    void recordAiRun({
      feature: "semantic_match_shadow",
      status: "success",
      provider: "deterministic",
      model: "weighted-token-v1",
      promptVersion: "semantic_shadow_v1",
      latencyMs: Date.now() - semanticStarted,
      actorUserId: guard.userId,
      entityType: "ProviderProfile",
      entityId: guard.providerProfileId,
      metadata: {
        candidateCount: allRequests.length,
        page,
        sort,
        hasCategoryFilter: Boolean(category),
        hasLocationFilter: Boolean(location),
        hasSearchFilter: Boolean(search),
        ...semanticSummary,
      },
    });

    // Sort
    if (sort === "newest") {
      scored.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    } else {
      // relevance (default)
      scored.sort((a, b) => {
        if (b.relevance !== a.relevance) return b.relevance - a.relevance;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
    }

    const pages = Math.ceil(total / perPage);
    const paginated = scored.slice((page - 1) * perPage, page * perPage);

    // Mark which of the visible leads this provider has already unlocked.
    const unlockedIds = await getUnlockedRequestIds(
      guard.providerProfileId,
      paginated.map((r) => r.id),
    );
    const requests = paginated.map((r) => ({
      ...r,
      isUnlocked: unlockedIds.has(r.id),
    }));

    return NextResponse.json({
      success: true,
      data: {
        requests,
        total,
        pages,
        page,
        creditBalance: guard.creditBalance,
        hasCategories: providerCategoryIds.length > 0,
        providerCategoryIds,
      },
    });
  } catch (error) {
    console.error("Provider requests error:", error);
    return NextResponse.json(
      { success: false, error: "Klaida" },
      { status: 500 }
    );
  }
}
