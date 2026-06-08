# Paslaugurinka.lt Taxonomy Coverage and Shadow Routing Findings

> **Read-only findings document (2026-06-08). No runtime code changed, no Prisma schema changed, no migrations written, no production DB touched, no requests created, no provider matching changed, not proceeding to Phase 2.**
> Companion to [`phase-a2-routing-contract-plan.md`](./phase-a2-routing-contract-plan.md), [`taxonomy-deduplication-audit.md`](./taxonomy-deduplication-audit.md), and [`marketplace-platform-routing-integration-audit.md`](./marketplace-platform-routing-integration-audit.md).
> Production commit at time of writing: `c3fe5cb`. `ROUTING_SHADOW_ENABLED=true`.

## Context

This document records **read-only** taxonomy coverage findings gathered from production shadow-mode validation **after A2.1** (commit `c3fe5cb`, "carry category identity through Phase 1 shadow"). The goal was to:

1. Confirm the A2.1 shadow audit result, and
2. Identify which shadow-routing branches are still **not exercised** by real data, by inspecting the live taxonomy and historical request/category data.

All numbers below come from `SELECT`-only queries against the production database (tables: `categories`, `service_requests`, `service_request_categories`, `routing_decision_logs`). Nothing was written, created, or migrated. This is a findings record only — it carries no schema, code, or DB action.

## A2.1 Production Shadow Status

Audited window: the 17 shadow rows present in `routing_decision_logs` at commit `c3fe5cb`.

| Check | Result |
|---|---|
| Routing logs valid | 17 / 17 |
| Logs joined to `service_requests` | 17 / 17 |
| `v4CategoryIds` ⊆ / = `oldCategoryIds` | 17 / 17 |
| Invented (never-seen) IDs | 0 |
| `unmatchedCategoryNames` | 0 |
| Empty v4 outputs | 0 |
| Orphan logs (no parent request) | 0 |
| Coverage of created `service_requests` in window | 100% |

**Verdict: PASS.** In the audited window, A2.1 shadow routing never invented an ID, never dropped a request to an empty output, never produced an unmatched name, and every v4 category set was a subset of (or equal to) the request's original category set. Provider matching and production behavior were unaffected (shadow-only).

## Why A2.1 Was Necessary

A2.1 deliberately **carries the request's original category IDs through the routing pipeline** instead of re-resolving category *names* to IDs. This matters because the live taxonomy has **massive duplicate-name ambiguity**, so a `categoryName → categoryId` mapping is fundamentally unsafe.

Exact numbers from the live taxonomy (active `service` nodes: `id LIKE 'tax_%'`, `pageType='service'`, `externalSource='paslaugurinka-taxonomy'`, `isActive=true`):

| Metric | Value |
|---|---|
| Active live-tax service categories | 3,255 |
| Category **names** with more than one active `tax_` ID | 820 |
| Active live-tax rows that belong to a duplicate-name group | 2,133 / 3,255 |
| Share of live taxonomy affected by duplicate-name ambiguity | **65.5%** |
| Historically attached categories with an ambiguous (duplicated) name | 31 / 79 distinct |

Interpretation:

- **Two-thirds (65.5%) of the live taxonomy** cannot be uniquely identified by name alone — the name resolves to 2–8 distinct active `tax_` IDs.
- This is not theoretical: among categories actually attached to historical requests, **31 of 79 distinct categories (≈39%)** carry a duplicated name. A name-based mapper would already be hitting ambiguity in real data.
- A2.1 sidesteps this entirely: in Phase 1 the request already stores its categories as `tax_` IDs, so the correct identity is **already in hand** and no name→ID round-trip is needed. The remap that *creates* the ambiguity is unnecessary in Phase 1.

> Note on a neighboring count: [`taxonomy-deduplication-audit.md`](./taxonomy-deduplication-audit.md) and [`phase-a2-routing-contract-plan.md`](./phase-a2-routing-contract-plan.md) cite ~821 duplicate-name groups; this document's 820 comes from the same `GROUP BY name HAVING count(*) > 1` over the active-`service` set. The 1-group difference is a filter-boundary nuance, not a contradiction — both confirm the same scale (~820 groups, ~65% of rows).

## DISTINCT_TAX Examples

The same category **name** can exist on multiple active `tax_` nodes, each under a **different parent/root branch**. Category name alone is therefore **not a stable identity** — it does not tell you which branch (and thus which provider pool) is meant.

| Category name | Active `tax_` IDs | Notes |
|---|---|---|
| Google Ads reklama | 8 | spans SEO / Reklamos paslaugos / Rinkodara / Interneto svetainių administratoriai — 3 root branches |
| Balkonų stiklinimas | 7 | Langai,durys / Stiklo konstrukcijos / Stiklų,veidrodžių gamyba — Buitinės / Interjeras / Statybos |
| Terasų stiklinimas | 7 | same three-branch split as Balkonų stiklinimas |
| Knygų iliustravimas | 7 | Dailininkai / Grafikos dizaineriai / Iliustruotojai — 4 root branches |
| Apleistų sklypų tvarkymas | 6 | Aplinkos tvarkymas / Medžių genėjimas / Miškininkai / Vejos priežiūra — **already used in a real request** |
| Autobusų, limobusų nuoma | 6 | Automobilių nuoma / Keleivių pervežimas / Nuomos / Transportas — **already used in a real request** |
| Šilumos siurblių montavimas | 6 | Alternatyvi energija / Katilų montavimas / Santechnikai / Ventiliacija |
| Drenažo įrengimas | 5 | Aplinkos tvarkymas / Santechnikai / Trinkelių klojimas — **already used in a real request** |
| Sodybos nuomai | 3 | Nuomos paslaugos / Renginiai,šventės / Laisvalaikis — the canonical case (see A2 plan) |

Because the marketplace **multi-places** one leaf under several parents while the v4 source taxonomy lists it once, the taxonomies are not isomorphic and a name cannot recover the intended placement. This is exactly why Phase 1 must carry the original ID rather than re-derive it from the name.

## Catch-all / Generic Suppression Coverage

**The suppression branch has not yet been exercised in production.**

- Historical data contains **no request that combines a generic/root category with a specific leaf category**. A read-only check across all 111 category attachments returned **zero** generic+specific combinations.
- Older requests carry exactly one broad **root** category and no specific leaf (e.g. `Statybos, apdaila` alone, `Aplinka, sodas` alone, `Valymo paslaugos` alone). Newer requests carry 1–3 **specific** leaves and never a generic alongside them.
- Therefore the catch-all suppression logic (drop the broad bucket when a specific sibling is present) is **not production-validated** — there has been no input that would trigger it.

Generic / catch-all candidates that *would* exercise suppression if paired with a specific leaf (live `tax_` nodes):

| Generic candidate | Level | Note |
|---|---|---|
| Kitos paslaugos | root (depth 0) | purest catch-all root |
| Kitos įvairios paslaugos | branch (depth 1) | under "Kitos paslaugos" — double-generic |
| Kitos laisvalaikio paslaugos | branch (depth 1) | under "Laisvalaikis, pramogos, turizmas" |
| Kitos paslaugos renginiams | branch (depth 1) | under "Renginiai, šventės" |
| Kitos statybos paslaugos | leaf (depth 2) | under "Statybos darbai" — 28 siblings; the only true leaf-level catch-all |
| Įvairios paslaugos vestuvėms | branch (depth 1) | under "Renginiai, šventės" |
| Įvairios technikos nuoma | branch (depth 1) | under "Nuomos paslaugos" |
| Statybos darbai | branch (depth 1) | broad construction bucket (+ legacy `paslaugos.lt` duplicate) |
| Meistrai į namus | branch (depth 1) | broad "handyman" bucket (+ legacy `paslaugos.lt` duplicate) |
| Reklamos paslaugos | branch (depth 1) | broad advertising bucket, itself duplicated across 2 branches |

Note that generic single words (`Kita`, `Montavimas`, `Remontas`, `Įrengimas`, `Valymas`, `Dažymas`, `Transportavimas`) do **not** exist as standalone live-tax categories — the taxonomy uses compound names. The real generics live at root (depth 0) and branch (depth 1) level, plus a handful of `Kitos …` leaves.

## Important Phase 2 Implications

- **Phase 2 must not use `categoryName → categoryId` as the source of truth.** With 65.5% of the taxonomy carrying ambiguous names, name-based resolution would route a large fraction of categories to an arbitrary branch.
- **Phase 2 needs a `TaxonomyContract` (or equivalent stable category-identity layer)** so that any v4 output is bound to a specific `tax_` node, not a name. This is not yet implemented.
- **Any broadening or invention of new category IDs must be reviewable and auditable** — Phase 2 proposes categories the request did not already have, which is precisely where a stable-identity contract becomes mandatory.
- **Low confidence + semantic mismatch should route to review / broadening candidates**, not straight into automatic provider matching.
- **Suppression should use taxonomy structure** — `depth`, `parentId`, `rootId`, `path`, and sibling relationships — and not rely on string keyword matching alone. The structure (3 levels: 26 roots → 516 branches → 2,713 leaves) is what reliably distinguishes a broad bucket from a specific leaf.

## Current Recommendation

- **Continue collecting shadow logs until at least 100 real rows** before drawing Phase 2 conclusions (current audited window: 17).
- **Do not start Phase 2 yet.**
- **Do not change provider matching yet.**
- **Do not run production synthetic tests** unless explicitly approved — creating a generic+specific request would trigger the live provider-notify/email path.
- **If suppression needs to be tested, prefer staging/local before production.** A synthetic input that naturally yields a broad-bucket + specific-leaf pair (e.g. "Statybos darbai" + "Plytelių klijavimas", or "Meistrai į namus" + "Karnizų, roletų montavimas") would exercise the suppression branch; DISTINCT_TAX ambiguity can be probed in isolation with names like "Balkonų stiklinimas" or "Šilumos siurblių montavimas". None of this requires code, schema, or DB changes.

## Non-goals

This document explicitly does **not** involve and does **not** recommend, as a necessary next step:

- No DB changes
- No code changes
- No migrations
- No Prisma schema changes
- No provider matching changes
- No Phase 2 implementation
- No production request creation
