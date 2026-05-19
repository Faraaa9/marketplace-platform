/**
 * Category Service — business logic on top of the repository.
 * Handles alias resolution, DTO mapping, breadcrumbs, subtree helpers.
 */

import * as repo from "./category-repository";

// ── Types ────────────────────────────────────────────────────────────

export interface CategoryListDto {
  id: string;
  name: string;
  slug: string;
  depth: number;
  pageType: string | null;
  childrenCount: number;
  supplierCount: number;
}

export interface CategoryDetailDto {
  id: string;
  name: string;
  slug: string;
  depth: number;
  path: string;
  pageType: string | null;
  parentId: string | null;
  rootId: string | null;
  sortOrder: number;
  parent: { id: string; name: string; slug: string } | null;
  root: { id: string; name: string; slug: string } | null;
  childrenCount: number;
  aliases: Array<{ id: string; aliasName: string; aliasSlug: string | null; source: string | null }>;
}

export interface Breadcrumb {
  name: string;
  slug: string;
  current?: boolean;
}

// ── DTO mappers ──────────────────────────────────────────────────────

function toDto(cat: NonNullable<Awaited<ReturnType<typeof repo.findBySlug>>>): CategoryDetailDto {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    depth: cat.depth,
    path: cat.path,
    pageType: cat.pageType,
    parentId: cat.parentId,
    rootId: cat.rootId,
    sortOrder: cat.sortOrder,
    parent: cat.parent || null,
    root: cat.root || null,
    childrenCount: cat._count?.children ?? 0,
    aliases: cat.aliases || [],
  };
}

function toListDto(cat: { id: string; name: string; slug: string; depth: number; pageType: string | null; _count?: { children: number } }, supplierCount?: number): CategoryListDto {
  return {
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    depth: cat.depth,
    pageType: cat.pageType,
    childrenCount: cat._count?.children ?? 0,
    supplierCount: supplierCount ?? 0,
  };
}

// ── Service methods ──────────────────────────────────────────────────

export async function getRoots(): Promise<CategoryListDto[]> {
  const [roots, supplierCounts] = await Promise.all([
    repo.findRoots(),
    repo.getRootSupplierCounts(),
  ]);
  return roots.map((r) => toListDto(r, supplierCounts.get(r.id) ?? 0));
}

export async function getBySlug(slug: string): Promise<{ category: CategoryDetailDto; resolvedFrom: string | null } | null> {
  let category = await repo.findBySlug(slug);
  let resolvedFrom: string | null = null;

  if (!category) {
    const canonicalSlug = await repo.resolveAlias(slug);
    if (canonicalSlug) {
      category = await repo.findBySlug(canonicalSlug);
      resolvedFrom = slug;
    }
  }

  if (!category) return null;

  return { category: toDto(category), resolvedFrom };
}

export async function getChildren(slug: string) {
  const category = await repo.findBySlug(slug);
  if (!category) return null;

  const children = await repo.findChildren(category.id);
  return {
    parent: toListDto(category),
    children: children.map(toListDto),
  };
}

export async function getSubtree(slug: string) {
  const category = await repo.findBySlug(slug);
  if (!category) return null;

  return repo.findSubtree(category.id);
}

export function buildBreadcrumbs(category: CategoryDetailDto): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [];

  if (category.root && category.root.slug !== category.slug) {
    crumbs.push({ name: category.root.name, slug: category.root.slug });
  }

  if (
    category.parent &&
    category.parent.slug !== category.slug &&
    (!category.root || category.parent.slug !== category.root.slug)
  ) {
    crumbs.push({ name: category.parent.name, slug: category.parent.slug });
  }

  crumbs.push({ name: category.name, slug: category.slug, current: true });
  return crumbs;
}

export async function getStats() {
  return repo.getCategoryStats();
}
