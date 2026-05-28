import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { expandToMatchSet } from "@/lib/category-matching";
import { getUnlockedRequestIds } from "@/lib/credits";
import { recordAiRun } from "@/lib/ai/audit";
import {
  calculateSemanticMatch,
  summarizeSemanticScores,
} from "@/lib/semantic-match";
import { RequestCard, type ProviderLead } from "./RequestCard";

const PER_PAGE = 20;
// Hard limit to bound Node-side scoring/sorting work (see the legacy API route).
const MAX_SCORED_LEADS = 500;

interface SearchParams {
  page?: string;
  category?: string;
  location?: string;
  search?: string;
  sort?: string;
}

function resultCountLabel(total: number) {
  if (total === 0) return "Nerasta";
  const noun = total === 1 ? "užklausa" : total < 10 ? "užklausos" : "užklausų";
  return `${total} ${noun}`;
}

export async function RequestsList({
  userId,
  searchParams,
}: {
  userId: string;
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10) || 1);
  const category = sp.category || "";
  const location = sp.location || "";
  const search = sp.search || "";
  const sort = sp.sort || "relevance";
  const semanticStarted = Date.now();

  // The edge proxy (src/proxy.ts) enforces auth + PROVIDER role for /tiekejas/*,
  // but NOT email-verification or active status. An unverified or suspended
  // provider must not browse leads — send them to the dashboard, which explains
  // why (mirrors the legacy client's EMAIL_NOT_VERIFIED / ACCOUNT_NOT_ACTIVE
  // redirect).
  const profile = await prisma.providerProfile.findUnique({
    where: { userId },
    select: {
      id: true,
      isActive: true,
      headline: true,
      description: true,
      services: true,
      primaryService: true,
      specializations: true,
      location: true,
      categories: {
        select: { categoryId: true, category: { select: { name: true } } },
      },
      user: { select: { emailVerified: true } },
    },
  });

  if (!profile || !profile.isActive || !profile.user?.emailVerified) {
    redirect("/tiekejas");
  }

  const providerProfileId = profile.id;
  const providerCategoryIds = profile.categories.map((c) => c.categoryId);
  const providerLocation = profile.location || "";

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
    clientId: { not: userId },
    categoryId: { in: filterIds },
  };
  // "Visa Lietuva" is the nationwide tag — a specific city must also surface
  // nationwide requests.
  if (location && location !== "Visa Lietuva") {
    where.location = { in: [location, "Visa Lietuva"] };
  }
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

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
          where: { providerId: userId },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { createdAt: "desc" },
      take: MAX_SCORED_LEADS,
    }),
  ]);

  // Score relevance + mark responded. Multi-cat: a request matches if ANY of
  // its category IDs is in the provider's match set.
  const providerMatch = new Set(providerMatchSet);
  const scored = allRequests.map((reqRow) => {
    let score = 0;
    const requestCategoryIds =
      reqRow.categories.length > 0
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
        headline: profile.headline,
        description: profile.description,
        services: profile.services,
        primaryService: profile.primaryService,
        specializations: profile.specializations,
        categories: profile.categories.map((category) => category.category.name),
      },
      {
        title: reqRow.title,
        description: reqRow.description,
        budget: reqRow.budget,
        deadline: reqRow.deadline,
        categoryName: reqRow.categoryRef?.name,
      },
    );
    const categoryNames = reqRow.categories
      .map((link) => link.category?.name?.trim() ?? "")
      .filter((name) => name.length > 0);
    return {
      id: reqRow.id,
      title: reqRow.title,
      description: reqRow.description,
      categoryRef: reqRow.categoryRef,
      categoryNames:
        categoryNames.length > 0
          ? categoryNames
          : reqRow.categoryRef?.name
            ? [reqRow.categoryRef.name]
            : [],
      location: reqRow.location,
      budget: reqRow.budget,
      createdAt: reqRow.createdAt,
      relevance: score,
      semanticShadowScore: semantic.score,
      hasResponded: reqRow.responses.length > 0,
      _count: reqRow._count,
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
    actorUserId: userId,
    entityType: "ProviderProfile",
    entityId: providerProfileId,
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

  if (sort === "newest") {
    scored.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  } else {
    scored.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  const pages = Math.ceil(total / PER_PAGE);
  const paginated = scored.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Mark which of the visible leads this provider has already unlocked.
  const unlockedIds = await getUnlockedRequestIds(
    providerProfileId,
    paginated.map((r) => r.id),
  );
  const requests: ProviderLead[] = paginated.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    categoryRef: r.categoryRef,
    categoryNames: r.categoryNames,
    location: r.location,
    budget: r.budget,
    createdAt: r.createdAt,
    relevance: r.relevance,
    hasResponded: r.hasResponded,
    isUnlocked: unlockedIds.has(r.id),
    _count: r._count,
  }));

  const hasFilters = !!(category || location || search);
  // A provider with no categories has an empty match set, so the lead query can
  // never return anything — the generic "no active requests" copy would be
  // misleading. Point them at their profile instead.
  const hasNoCategories = providerCategoryIds.length === 0;

  if (requests.length === 0) {
    return <EmptyState hasFilters={hasFilters} sort={sort} noCategories={hasNoCategories} />;
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <p className="text-caption text-surface-400">{resultCountLabel(total)}</p>
      </div>
      <div className="space-y-3">
        {requests.map((req) => (
          <RequestCard key={req.id} req={req} />
        ))}
      </div>
      <ListPagination currentPage={page} totalPages={pages} sp={sp} />
    </>
  );
}

function buildHref(sp: SearchParams, page: number) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (sp.category) params.set("category", sp.category);
  if (sp.location) params.set("location", sp.location);
  if (sp.search) params.set("search", sp.search);
  if (sp.sort && sp.sort !== "relevance") params.set("sort", sp.sort);
  const qs = params.toString();
  return qs ? `/tiekejas/uzklausos?${qs}` : "/tiekejas/uzklausos";
}

function ListPagination({
  currentPage,
  totalPages,
  sp,
}: {
  currentPage: number;
  totalPages: number;
  sp: SearchParams;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | string)[] = [];
  for (let i = 1; i <= totalPages; i++) {
    if (
      i === 1 ||
      i === totalPages ||
      (i >= currentPage - 1 && i <= currentPage + 1)
    ) {
      pages.push(i);
    } else if (pages[pages.length - 1] !== "...") {
      pages.push("...");
    }
  }

  const arrowClass =
    "rounded-lg p-2 text-surface-600 transition-colors hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800";

  return (
    <nav className="mt-8 flex items-center justify-center gap-1">
      {currentPage > 1 ? (
        <Link
          href={buildHref(sp, currentPage - 1)}
          className={arrowClass}
          aria-label="Ankstesnis puslapis"
        >
          <ChevronLeft className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(arrowClass, "cursor-not-allowed opacity-50")}>
          <ChevronLeft className="h-4 w-4" />
        </span>
      )}
      {pages.map((p, i) =>
        typeof p === "string" ? (
          <span key={`dots-${i}`} className="px-2 text-surface-400">
            ...
          </span>
        ) : (
          <Link
            key={p}
            href={buildHref(sp, p)}
            aria-current={p === currentPage ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1 text-sm font-medium transition-colors",
              p === currentPage
                ? "bg-brand-600 text-white"
                : "text-surface-700 hover:bg-surface-100 dark:text-surface-300 dark:hover:bg-surface-800",
            )}
          >
            {p}
          </Link>
        ),
      )}
      {currentPage < totalPages ? (
        <Link
          href={buildHref(sp, currentPage + 1)}
          className={arrowClass}
          aria-label="Kitas puslapis"
        >
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className={cn(arrowClass, "cursor-not-allowed opacity-50")}>
          <ChevronRight className="h-4 w-4" />
        </span>
      )}
    </nav>
  );
}

function EmptyState({
  hasFilters,
  sort,
  noCategories,
}: {
  hasFilters: boolean;
  sort: string;
  noCategories: boolean;
}) {
  // No categories is the root cause (the match set is empty), so it takes
  // priority over the filter/empty messaging — clearing filters wouldn't help.
  if (noCategories) {
    return (
      <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-10 text-center sm:p-14 dark:border-surface-700 dark:bg-surface-900">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
          <FileText className="h-6 w-6 text-surface-400" />
        </div>
        <h3 className="text-body font-semibold text-surface-900 dark:text-white">
          Pasirinkite specializacijas
        </h3>
        <p className="mx-auto mt-1.5 max-w-sm text-body-sm text-surface-500 dark:text-surface-400">
          Užklausos rodomos pagal jūsų paslaugų sritis. Pridėkite specializacijas profilyje, kad matytumėte tinkamas užklausas.
        </p>
        <Link
          href="/tiekejas/profilis"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Pildyti profilį
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-surface-300 bg-white p-10 text-center sm:p-14 dark:border-surface-700 dark:bg-surface-900">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-100 dark:bg-surface-800">
        {hasFilters ? (
          <Search className="h-6 w-6 text-surface-400" />
        ) : (
          <FileText className="h-6 w-6 text-surface-400" />
        )}
      </div>
      <h3 className="text-body font-semibold text-surface-900 dark:text-white">
        {hasFilters
          ? "Pagal filtrus užklausų nerasta"
          : "Aktyvių užklausų šiuo metu nėra"}
      </h3>
      <p className="mx-auto mt-1.5 max-w-sm text-body-sm text-surface-500 dark:text-surface-400">
        {hasFilters
          ? "Pabandykite pakeisti filtrus arba peržiūrėti visas užklausas."
          : "Kai klientai pateiks naujas užklausas, jos atsiras čia."}
      </p>
      {hasFilters && (
        <Link
          href={sort !== "relevance" ? `/tiekejas/uzklausos?sort=${sort}` : "/tiekejas/uzklausos"}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-body-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
        >
          Išvalyti filtrus
        </Link>
      )}
    </div>
  );
}
