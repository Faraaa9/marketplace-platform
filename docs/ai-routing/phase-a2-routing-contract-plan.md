# Phase A2 — routing-contract plan (stable category identity for v4)

> **Planning document (2026-06-08). No code changed, no migrations written, no DB touched, not proceeding to Phase 2.**
> Builds on the Phase A mapper fix (commit `b2c65a4`) and [`taxonomy-deduplication-audit.md`](./taxonomy-deduplication-audit.md). Grounded in the production DB + the v4 research repo (`~/Documents/KATEGORIJOS + 200K-uzklausu/scripts/ai-routing/`).

## 1. Where we are
Phase A restricted the shadow name→id index to the live `tax_` (active `pageType=service`) space, so v4 can no longer resolve a category name to a dead `barehex`/`svc-`/`leaf` id. Verified in prod: "Sodybos nuomai" now logs a `tax_` id, not the old barehex `0994160858b6`.

**Remaining blocker — DISTINCT_TAX.** The same category *name* exists on multiple **active `service` `tax_`** nodes (821 such groups; see the audit). Name-only routing cannot choose between them, so Phase A's mapper picks the lowest id **deterministically but arbitrarily** — possibly the wrong parent context. v4 must emit a **stable category identity**, not just a name, before its output can drive real provider matching.

## 2. The exact DISTINCT_TAX problem
- `Category.slug` is `@unique`, so each node has a distinct slug — but v4 emits **names**, and a name is *not* unique.
- The marketplace **multi-places** one leaf under several parents; the v4 source taxonomy (`taxonomy_flat.jsonl`) lists that leaf **once**. The taxonomies are **not isomorphic**, so even the v4 path can't identify which marketplace placement is intended.
- Result: a correctly-named v4 output maps to an arbitrary one of N valid `tax_` ids → leads route to providers under the wrong parent branch (or, with fan-out, all branches).

### Production evidence — "Sodybos nuomai"
Three active `service` `tax_` nodes, three different parents; the v4 source has it in one place ("Renginiai"):

| marketplace id | parent (context) | path | note |
|---|---|---|---|
| `tax_1366216ea80fa9898e` | **Nuomos paslaugos** (rentals) | `nuomos-paslaugos/sodybos-nuomai` | the id the test request actually carried — semantically best |
| `tax_0b40ccdecc82452a0a` | **Renginiai, šventės** (events) | `renginiai-sventes/sodybos-nuomai` | what Phase A's lowest-id rule picks — arbitrary |
| `tax_b4ee86103802798413` | **Laisvalaikis, pramogos, turizmas** | `laisvalaikis-pramogos-turizmas/sodybos-nuomai` | third valid placement |
| `0994160858b6` (barehex/leaf) | Renginiai *(paslaugos.lt)* | `renginiai/sodybos-nuomai` | dead id the **pre-A** mapper picked |

The shadow log for the test request showed `oldPrimaryCategoryId = tax_1366…` (the request's own, correct id) but `v4CategoryIds = [tax_0b40…]` — the round-trip through the name lost the correct placement.

### Other live DISTINCT_TAX examples (from prod)
- **"Reklamos paslaugos"** — `tax_4bfc…` under *Reklama, dizainas, spauda* vs `tax_08e3…` under *Paslaugos verslui*. Different meaning-by-context; both carry a provider.
- **"Automobilių nuoma"** — three `tax_` placements incl. under *Renginiai, šventės*.
- **"Santechnikai, santechnikos darbai"**, **"Kalviai, kalvystės darbai"** — 2–3 active `tax_` nodes each, with their own child subtrees.

## 3. Root-cause reframing (this changes the recommendation)
`classifyMultiRouting` (and the Python `classify()` it ports) is a **filter**: `routing = [...candidates]` then drop suppressible catch-alls. **It never adds a category that wasn't a candidate.** In Phase 1 the candidates are the request's already-curated categories — which the request already stores as `tax_` **ids**. So:

> In Phase 1, every v4 output name corresponds to a candidate the request already identified by id. The name→id remap that creates the DISTINCT_TAX ambiguity is **unnecessary** — the correct id is already in hand.

The five listed options all assume v4 must *re-resolve a name to an id*. That is only true when v4 **proposes a category the request didn't already have** — i.e. **Phase 2** (broadening candidates from free text). So the contract splits cleanly:
- **Phase 1 (today):** carry identity through; no resolution needed.
- **Phase 2 (future):** v4 proposes new categories by name → genuine stable-identity problem → options below.

## 4. Options compared
What the v4 **source** can emit (`taxonomy_flat.jsonl` = `{parent, category, subcategory, level, canonical_name, source}`): **name + 3-level path only — no id, no slug.**

| # | Option | Disambiguates DISTINCT_TAX? | Feasible with v4 source as-is? | Coupling / cost | Verdict |
|---|---|---|---|---|---|
| **0** | **Carry category identity (id) through the contract** | **Yes for Phase-1 candidates** (id already known) | Yes — candidates already have ids | Trivial code, no taxonomy work | **Adopt now (A2.1)** |
| 1 | Emit `slug`/`externalSlug` from v4 | Yes *if* a slug existed | **No** — v4 source has no slug; marketplace `externalSlug` is the *paslaugurinka* slug, not paslaugos.lt | Requires generating/syncing slugs ≈ a crosswalk | Subsumed by #5 |
| 2 | Emit `Category.id` after syncing taxonomy | Yes | **No** — v4 source has no ids; taxonomies aren't 1:1 (marketplace multi-places leaves) | Highest — couples research repo to marketplace ids | Reject (for now) |
| 3 | Match by full **path** (parent › child › leaf) | Partially — only where parent names align | Partially — v4 has a path, but parents diverge ("Renginiai" vs "Renginiai, šventės"/"Nuomos paslaugos") | Medium; brittle across the two taxonomies | Use as a **seed** for #5, not standalone |
| 4 | **Fan out** to all matching active `service` `tax_` ids | Avoids *wrong* id by hitting *all* | Yes | Low; over-notifies | **Adopt as safe default (A2.3)** for unresolved names |
| 5 | **`canonicalCategoryId` / `TaxonomyContract` crosswalk table** | Yes — one human-decided canonical per v4 key | Yes — table maps v4 key→`tax_` id | Medium build + maintenance | **Adopt as durable resolver (A2.2)** for Phase 2 |

## 5. Recommended approach for marketplace-platform
A three-layer contract, shipped in order:

**A2.1 — Carry identity through the v4 contract (do this now; unblocks Phase 1 shadow correctness).**
Change the classifier's I/O from `string[]` names to candidate **objects** that keep the id, and have the filter return the surviving candidates *with their ids preserved*:
```ts
// multi-routing-v4.ts (contract)
interface RoutingCandidate { id: string; name: string }            // was: name only
interface MultiRoutingResult {
  routingCategories: RoutingCandidate[];   // surviving candidates, ids preserved
  // …projectType, routingTags, routingConfidence unchanged
}
```
In `shadow.ts`, build candidates from the request's `{id, name}` pairs (it already has `oldCategoryIds` + `namesForIds`), pass them in, and write `v4CategoryIds = result.routingCategories.map(c => c.id)`. **No name→id remap, no taxonomy reconciliation, zero DISTINCT_TAX ambiguity for the suppression path.** `mapNamesToCategoryIds` is kept only for the Phase-2 "proposed by name" path (below).

**A2.2 — `TaxonomyContract` crosswalk (Phase-2 prerequisite; build incrementally).**
A table mapping a stable **v4 key** (canonical name, optionally + source path) to exactly one **canonical** marketplace `tax_` id, encoding the human decisions the audit's 821 DISTINCT groups require ("Sodybos nuomai" → `tax_1366…` *Nuomos paslaugos*). The Phase A ambiguity warning already logs which names need an entry. Seed it with Option 3 (path) matches where the parent aligns, then human-review the rest.

**A2.3 — Fan-out as the safe default (A2.4 fallback for anything unresolved).**
For any v4-**proposed** name (Phase 2) not yet in the crosswalk, route to **all** matching active `service` `tax_` ids (`mapNamesToCategoryIds` returning the full set, not first-writer). Never a dead/wrong-only id; only over-notifies — acceptable at the current provider scale (14 active), and self-limiting as the crosswalk fills in.

Rejected: **Option 2** (id-sync) couples the repos and assumes isomorphic taxonomies (false). **Option 1** (slug) has no native source and reduces to #5. **Option 3** standalone is too brittle (parent divergence) — it feeds #5.

## 6. Schema / code changes needed
**A2.1 (code only, no schema):**
- `src/lib/routing/multi-routing-v4.ts` — `MultiRoutingInput.candidateCategories: RoutingCandidate[]`; `MultiRoutingResult.routingCategories: RoutingCandidate[]`; filter preserves objects. Keep `fold`/suppression logic. Update `scripts/shadow-routing-smoke.ts` + any unit test to the new shape.
- `src/lib/routing/shadow.ts` — pass `{id,name}` candidates; set `v4CategoryIds` from preserved ids; drop the name→id remap on the suppression path (retain `mapNamesToCategoryIds` import for A2.3 only). `RoutingDecisionLog` schema unchanged (still stores `v4CategoryIds string[]`).
- Research repo (consume-only): if/when Phase 2 needs it, `classify()` would also carry candidate ids — but Phase 1 doesn't require touching it.

**A2.2 (new schema, Phase-2 prep):**
```prisma
model TaxonomyContract {
  id                 String   @id @default(cuid())
  v4Name             String                  // canonical_name from v4 source
  v4Path             String?                 // optional parent>child path for tie-breaks
  canonicalCategoryId String                 // -> Category.id (active service tax_)
  decidedBy          String?                 // human/audit provenance
  createdAt          DateTime @default(now())
  canonical Category @relation(fields: [canonicalCategoryId], references: [id])
  @@unique([v4Name, v4Path])
  @@index([v4Name])
}
```
(Alternative: a `Category.canonicalCategoryId` self-pointer for in-table merges — but a separate contract table keeps the divergent v4↔marketplace mapping explicit and reversible.)

**A2.3 (code only):** `taxonomy-map.ts` — add a `mapNameToCategoryIds` (plural) returning all active-service matches; dispatch fans out over the union for Phase-2-proposed names.

## 7. Migration / data requirements
- **A2.1:** none — pure code; no data migration, no schema change. (Independent of the held Phase-B dedup migration.)
- **A2.2:** populate `TaxonomyContract` for the names v4 can propose. Source rows from the audit CSV's DISTINCT_TAX groups; auto-seed where the v4 source path matches a single marketplace path (Option 3), then human-decide the remainder. This is **additive** (no rewrite of `Category`), so it composes with — but does not require — the dedup migration.
- No change to `routing_decision_logs`; existing shadow rows remain comparable (`v4CategoryIds` semantics improve, not break).

## 8. Rollout plan
1. **A2.1** behind the existing `ROUTING_SHADOW_ENABLED` flag: ship the contract change, re-run the shadow replay over historical requests, and confirm `v4CategoryIds == oldCategoryIds` for pure-suppression cases (i.e. the request's own ids survive). The ambiguity warning count for the suppression path should go to **0**.
2. Accumulate live shadow data (or backfill the 51) and confirm zero dead-id / wrong-placement logs.
3. **A2.2**: introduce `TaxonomyContract`, seed + human-review using the audit CSV; keep it shadow-only.
4. **A2.3**: wire fan-out for unresolved proposed names — still shadow.
5. Only after A2.1–A2.3 are stable in shadow does Phase 2 (free-text candidate broadening) or any *activation* of routing become a separate, gated decision.

## 9. Rollback plan
- **A2.1:** revert the `multi-routing-v4.ts` + `shadow.ts` commit, or flip `ROUTING_SHADOW_ENABLED=false`. No data written, so nothing to undo. `RoutingDecisionLog` rows from the new contract are still valid historical logs.
- **A2.2:** the table is additive — drop/empty `TaxonomyContract` to revert; `Category` is untouched. If the self-pointer variant is used instead, null out `canonicalCategoryId`.
- **A2.3:** revert the fan-out commit; mapper returns to single-id (A2.1 behaviour).
- Nothing here deletes or rewrites taxonomy data, so rollback never risks lead/provider data.

## 10. Why Phase 2 provider matching must wait
Phase 2 broadens candidates from **free text**, so v4 starts proposing categories the request never curated — categories that arrive **only as names**. Because (1) names are non-unique across the 821 DISTINCT_TAX groups and (2) the marketplace multi-places leaves that v4's source has once (taxonomies not isomorphic), a proposed name **cannot be resolved to the correct single `tax_` id deterministically**. Activating provider matching on such proposals would notify providers under an arbitrary parent branch (wrong leads) or require fan-out semantics that aren't in place yet. Phase 2 therefore depends on the stable-identity contract:
- **A2.1** fixes only the *suppression* path (Phase 1) — it does nothing for newly-proposed names.
- **A2.2 (crosswalk)** + **A2.3 (fan-out fallback)** are what make a *proposed* name routable safely.

Until `TaxonomyContract` covers the proposable names (or fan-out is accepted as the matching semantic) and the dedup decisions are made, Phase 2 matching would regress routing precision. Ship A2.1 now for correct Phase-1 shadow; gate Phase 2 on A2.2 + A2.3 + a non-trivial clean shadow sample.

---
_Read-only analysis. Verify every DISTINCT_TAX canonical decision against the audit CSV before populating `TaxonomyContract`._
