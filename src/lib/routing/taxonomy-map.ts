/**
 * Taxonomy name → `Category.id` mapper for multi-routing v4.
 *
 * v4 emits canonical Lithuanian category NAME strings (from the research repo's
 * `taxonomy_flat.jsonl`), while the marketplace stores categories with stable
 * ids. These are two independent snapshots of the same paslaugos.lt taxonomy
 * (audit §9 / R1), so mapping must be by name/slug/alias, not by shared id.
 *
 * This module is PURE (no DB import) so it can be unit-tested and run offline.
 * The DB-backed loader lives in `./shadow.ts`.
 *
 * Lookup order (first hit wins), all diacritic-folded for robustness:
 *   1. canonical name   2. slug   3. externalSlug   4. alias name   5. alias slug
 */

import { fold } from "./multi-routing-v4";

export interface CategoryLite {
  id: string;
  name: string;
  slug: string;
  externalSlug?: string | null;
}

export interface CategoryAliasLite {
  categoryId: string;
  aliasName: string;
  aliasSlug?: string | null;
}

export interface CategoryNameIndex {
  byName: Map<string, string>;
  bySlug: Map<string, string>;
  byExternalSlug: Map<string, string>;
  byAlias: Map<string, string>;
  /** id → canonical name, for resolving the OLD (current) categories in the log. */
  nameById: Map<string, string>;
}

function setFirst(map: Map<string, string>, key: string, id: string): void {
  // First writer wins: stable + deterministic when duplicate keys exist.
  if (key && !map.has(key)) map.set(key, id);
}

export function buildCategoryNameIndex(
  categories: CategoryLite[],
  aliases: CategoryAliasLite[] = [],
): CategoryNameIndex {
  const byName = new Map<string, string>();
  const bySlug = new Map<string, string>();
  const byExternalSlug = new Map<string, string>();
  const byAlias = new Map<string, string>();
  const nameById = new Map<string, string>();

  for (const c of categories) {
    if (!c?.id) continue;
    nameById.set(c.id, c.name);
    setFirst(byName, fold(c.name), c.id);
    setFirst(bySlug, fold(c.slug), c.id);
    if (c.externalSlug) setFirst(byExternalSlug, fold(c.externalSlug), c.id);
  }

  for (const a of aliases) {
    if (!a?.categoryId) continue;
    setFirst(byAlias, fold(a.aliasName), a.categoryId);
    if (a.aliasSlug) setFirst(byAlias, fold(a.aliasSlug), a.categoryId);
  }

  return { byName, bySlug, byExternalSlug, byAlias, nameById };
}

/** Resolve a single v4 category NAME to a `Category.id`, or null if unmatched. */
export function mapNameToCategoryId(
  index: CategoryNameIndex,
  name: string,
): string | null {
  const f = fold(name);
  if (!f) return null;
  return (
    index.byName.get(f) ??
    index.bySlug.get(f) ??
    index.byExternalSlug.get(f) ??
    index.byAlias.get(f) ??
    null
  );
}

export interface NameMappingResult {
  /** name → categoryId for every name that resolved (order preserved). */
  matched: Array<{ name: string; categoryId: string }>;
  /** Deduplicated category ids (a request maps to each Category at most once). */
  matchedIds: string[];
  /** v4 names that could not be resolved to any Category (logged, never thrown). */
  unmatched: string[];
}

export function mapNamesToCategoryIds(
  index: CategoryNameIndex,
  names: string[],
): NameMappingResult {
  const matched: Array<{ name: string; categoryId: string }> = [];
  const matchedIds: string[] = [];
  const seenIds = new Set<string>();
  const unmatched: string[] = [];

  for (const name of names) {
    const id = mapNameToCategoryId(index, name);
    if (id) {
      matched.push({ name, categoryId: id });
      if (!seenIds.has(id)) {
        seenIds.add(id);
        matchedIds.push(id);
      }
    } else {
      unmatched.push(name);
    }
  }

  return { matched, matchedIds, unmatched };
}

/** Resolve `Category.id[]` back to canonical names (for the OLD-routing snapshot). */
export function namesForIds(index: CategoryNameIndex, ids: string[]): string[] {
  return ids.map((id) => index.nameById.get(id)).filter((n): n is string => !!n);
}
