import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { activeCategoryFilter, expandToMatchSet } from "@/lib/category-matching";
import { getUnlockedRequestIds } from "@/lib/credits";
import { ltCount } from "@/lib/utils";
import { recordAiRun } from "@/lib/ai/audit";
import { calculateSemanticMatch, summarizeSemanticScores } from "@/lib/semantic-match";

/**
 * Lead feed for the provider account: open, approved requests in the
 * provider's active categories (tree-aware via expandToMatchSet, the same
 * matcher checkEligibility mirrors), never their own.
 */
export type LeadScope = "mine" | "fresh" | "all";

async function providerMatchSet(userId: string) {
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      location: true,
      headline: true,
      description: true,
      services: true,
      primaryService: true,
      specializations: true,
      categories: {
        where: activeCategoryFilter(),
        select: { categoryId: true, category: { select: { name: true } } },
      },
    },
  });
  const categoryIds = profile?.categories.map((c) => c.categoryId) ?? [];
  return { profile, categoryIds, matchSet: await expandToMatchSet(categoryIds) };
}

function baseWhere(userId: string): Prisma.ServiceRequestWhereInput {
  return { status: "OPEN", moderationStatus: "APPROVED", clientId: { not: userId } };
}

/** Matching leads this provider has not answered yet — the sidebar/KPI count. */
export async function countNewLeads(userId: string): Promise<number> {
  const { matchSet } = await providerMatchSet(userId);
  if (matchSet.length === 0) return 0;
  return prisma.serviceRequest.count({
    where: { ...baseWhere(userId), categoryId: { in: matchSet }, responses: { none: { providerId: userId } } },
  });
}

export async function getLeadFeed(userId: string, scope: LeadScope) {
  const { profile, categoryIds, matchSet } = await providerMatchSet(userId);
  const where: Prisma.ServiceRequestWhereInput = {
    ...baseWhere(userId),
    // "Visos" browses every open request; the lead page then explains
    // eligibility for ones outside the provider's categories.
    ...(scope === "all" ? {} : { categoryId: { in: matchSet } }),
    ...(scope === "fresh" ? { responses: { none: {} } } : {}),
  };

  const rows = await prisma.serviceRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      description: true,
      location: true,
      budget: true,
      deadline: true,
      createdAt: true,
      categoryId: true,
      categoryRef: { select: { name: true } },
      _count: { select: { responses: true } },
      responses: { where: { providerId: userId }, select: { id: true }, take: 1 },
    },
  });

  const unlocked = profile ? await getUnlockedRequestIds(profile.id, rows.map((r) => r.id)) : new Set<string>();
  if (profile) recordSemanticShadow(userId, profile, rows, scope);
  const match = new Set(matchSet);

  return {
    hasCategories: categoryIds.length > 0,
    location: profile?.location ?? null,
    leads: rows.map((r) => ({
      id: r.id,
      title: r.title,
      description: r.description,
      location: r.location,
      budget: r.budget,
      deadline: r.deadline,
      createdAt: r.createdAt,
      categoryName: r.categoryRef?.name ?? null,
      offerCount: r._count.responses,
      sentResponseId: r.responses[0]?.id ?? null,
      unlocked: unlocked.has(r.id),
      inMyCategories: !!r.categoryId && match.has(r.categoryId),
    })),
  };
}

export function competitionLabel(n: number) {
  return n === 0 ? "Pasiūlymų dar nėra" : `Jau ${ltCount(n, ["pasiūlymas", "pasiūlymai", "pasiūlymų"])}`;
}

type ShadowProfile = NonNullable<Awaited<ReturnType<typeof providerMatchSet>>["profile"]>;

/** Keeps the admin "semantic_match_shadow" health signal alive (formerly
 *  logged by the leads list API). Scores are recorded, never shown. */
function recordSemanticShadow(
  userId: string,
  profile: ShadowProfile,
  rows: { title: string; description: string; budget: string | null; deadline: string | null; categoryRef: { name: string } | null }[],
  scope: LeadScope,
) {
  const started = Date.now();
  const scores = rows.map(
    (r) =>
      calculateSemanticMatch(
        {
          headline: profile.headline,
          description: profile.description,
          services: profile.services,
          primaryService: profile.primaryService,
          specializations: profile.specializations,
          categories: profile.categories.map((c) => c.category.name),
        },
        { title: r.title, description: r.description, budget: r.budget, deadline: r.deadline, categoryName: r.categoryRef?.name },
      ).score,
  );
  void recordAiRun({
    feature: "semantic_match_shadow",
    status: "success",
    provider: "deterministic",
    model: "weighted-token-v1",
    promptVersion: "semantic_shadow_v1",
    latencyMs: Date.now() - started,
    actorUserId: userId,
    entityType: "ProviderProfile",
    entityId: profile.id,
    metadata: { candidateCount: rows.length, scope, ...summarizeSemanticScores(scores) },
  });
}
