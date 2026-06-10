# Taxonomy de-duplication audit — marketplace-platform

> **Read-only audit (2026-06-08). No DB writes, no migrations, no app-code changes were made to produce this document.** Generated against the production database. Companion data: [`taxonomy-deduplication-groups.csv`](./taxonomy-deduplication-groups.csv) — every duplicate group, every member, all reference counts and the KEEP/MERGE/REVIEW role.

## 1. Problem
v4 emits canonical category **names**; `src/lib/routing/taxonomy-map.ts` maps each name back to a `Category.id` to drive provider matching. The mapper (`buildCategoryNameIndex`) is **first-writer-wins** on the diacritic-folded name, and `shadow.ts` feeds it **every** category (all id-spaces, all `pageType`s, active+inactive, **no `ORDER BY`**). When a name is not unique, it resolves to whatever row the DB returned first — frequently a dead id in another id-space — so a correctly-classified lead can route to a category **no provider is attached to**.

The `categories` table holds **4235** rows in **three id-spaces**:

| id-space | count | meaning |
|---|--:|---|
| `tax_…` | 3255 | active curated service taxonomy (the live id-space) |
| `barehex` (e.g. `20fb37fba25f`) | 840 | a second snapshot, mixed `pageType` (incl. `leaf`) |
| `svc-…` | 140 | legacy slugs, mostly inactive |

## 2. There are TWO different problems (do not treat them the same)
Grouping all categories by `fold(name)` yields **1210** name-collision groups. They split into four classes — only two are safely mergeable:

| class | groups | mergeable? | what it is | action |
|---|--:|:--:|---|---|
| **SAFE_CONSOLIDATE** | 389 | ✅ | exactly **one** active `service` `tax_` node + same-meaning dup ids in `barehex`/`svc-`/inactive | merge dups → the `tax_` node |
| **TRUE_DUP_TAX** | 0 | ✅ | ≥2 active `service` `tax_` nodes sharing the **same parent** (accidental double-import) | merge to one `tax_` node |
| **DISTINCT_TAX** | 821 | ⛔ | ≥2 active `service` `tax_` nodes under **different parents** — same name, **ambiguous** (legitimate cross-branch reuse *or* accidental `tax_` duplication) | **DO NOT auto-merge** — manual review + fix the routing *contract* |
| **LEGACY_ONLY** | 0 | ▫️ | no active `service` `tax_` node (all `barehex`/`svc-`/inactive) | archive; not a routing target |

**Key insight:** the bulk of collisions are **DISTINCT_TAX (821)** — the same `service` name exists on ≥2 `tax_` nodes under different parents. Some are legitimate reuse (paslaugos.lt repeats leaf names across branches, and these nodes own real subtrees); some may be accidental `tax_` duplication. **From a bare name the mapper cannot tell which `tax_` node is meant — that is the unfixable-by-merging part.** Resolve case-by-case in review (the CSV gives parent/child/usage per node), and for routing, stop dispatching on bare names (§7/§8). Do **not** blanket-merge or blanket-delete these.

## 3. Headline findings
- **Current mapper resolves a non-canonical id for 389 of 389 mergeable groups**, and because there is no `ORDER BY` the pick is **not stable across deploys**.
- **Real routing damage is small and fixable:** only **39** groups have live provider/request references sitting on a non-canonical/ambiguous id. Live reference rows to repoint total **29** (see §4).
- **821** groups are genuine name-reuse (DISTINCT_TAX); **33** of those already carry live usage — these are the ones that make name-based routing unsafe.
- The mapper also pulls **840** `barehex` + **140** `svc-` rows it should never index at all.

## 4. Migration impact — MERGEABLE groups only (SAFE_CONSOLIDATE + TRUE_DUP_TAX = 389 groups, 421 ids)
Rows referencing a to-be-merged id, which a backfill would **repoint to the canonical id** (or **delete** on a uniqueness collision). DISTINCT_TAX / LEGACY_ONLY are **excluded** (not merged).

| table | column | rows to repoint | unique-collision (delete) | note |
|---|---|--:|--:|---|
| `provider_profile_categories` | `categoryId` | 8 | 1 | `@@unique(providerProfileId, categoryId)` |
| `service_request_categories` | `categoryId` | 10 | 0 | `@@unique(requestId, categoryId)` |
| `service_requests` | `categoryId` (FK) | 10 | — | nullable |
| `service_requests` | `category` (**slug string**) | 1 | — | rewrite to canonical slug |
| `category_aliases` | `categoryId` | 3 | — | dedupe aliases |
| `supplier_category_links` | `categoryId` | 0 | 0 | `@@unique(supplierRecordId, categoryId)` |
| `categories` | `parentId` (children of a merged node) | 702 | — | **archive with the dead tree** (Phase C), not reparent |
| `categories` | `rootId` (descendants of a merged node) | 780 | — | **archive with the dead tree** (Phase C), not repoint |
| `credit_transactions` | `categoryId` (**soft** ledger ref) | 0 | — | **leave as history** |

**Live-data migration is tiny: 29 rows** (8 provider + 10 request-category + 10 request-`categoryId` + 1 slug). The large `parentId`/`rootId` counts (702/780) are **not** live references — they are the internal structure of the dead `barehex`/`svc-` trees (e.g. the `barehex` "Statybos, apdaila" root owns 164 children). The recommended handling is to **archive each parallel tree wholesale** (Phase C), so those children are deactivated in place; **do not** reparent them into `tax_`.

**Critical:** `provider_profile_categories`, `service_request_categories`, `supplier_category_links` carry `@@unique(owner, categoryId)` — where the owner already links the canonical id, the duplicate link must be **DELETED**, not updated (collision counts above). `Category.slug` is `@unique`, so the denormalized `ServiceRequest.category` slug string must be rewritten to the **canonical's** slug. `credit_transactions` is an immutable ledger ("reference only") → exclude from backfill.

## 5. Dangerous groups (do not auto-merge)
| risk class | groups | why |
|---|--:|---|
| DISTINCT_TAX name reuse (different parents) | 821 | same name, different meaning — merging destroys real nodes |
| …of those, with live usage | 33 | name-based routing is actively ambiguous for these |
| current mapper picks wrong id (mergeable) | 389 | misrouting today; unstable without `ORDER BY` |
| live refs stranded on non-canonical id | 39 | must be repointed collision-safely |

### Top 20 risky groups
| # | name | class | id | space | pageType | act | prov | reqCat | reqDir | slug | child | use | role |
|--|--|--|--|--|--|--|--:|--:|--:|--:|--:|--:|--|
| 1 | Statybos, apdaila | SAFE CONSOLIDATE | `tax_97d19f4a1fc360211c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 66 | 620 | **KEEP** |
|  |  |  | `c000215c8f5e` | barehex | root | ✓ | 2 | 5 | 5 | 0 | 164 | 390 | merge |
| 2 | Aplinka, sodas | SAFE CONSOLIDATE | `tax_8550aaef8c0536c502` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 16 | 120 | **KEEP** |
|  |  |  | `5ca1bb13b074` | barehex | root | ✓ | 1 | 4 | 4 | 0 | 39 | 106 | merge |
| 3 | Kompiuterių supirkimas | DISTINCT TAX | `tax_5e9756ba3792f5a29a` | tax_ | service | ✓ | 0 | 1 | 1 | 1 | 0 | 3 | ⚠ review |
|  |  |  | `tax_80da95572654aeac05` | tax_ | service | ✓ | 0 | 1 | 0 | 0 | 0 | 1 | ⚠ review |
|  |  |  | `tax_caf5c9c6da377d45db` | tax_ | service | ✓ | 0 | 1 | 0 | 0 | 0 | 1 | ⚠ review |
| 4 | Dedikuotų serverių administravimas | DISTINCT TAX | `tax_264efa2cfa9a9fc1f0` | tax_ | service | ✓ | 0 | 1 | 1 | 1 | 0 | 3 | ⚠ review |
|  |  |  | `tax_1d02509819c062646e` | tax_ | service | ✓ | 0 | 1 | 0 | 0 | 0 | 1 | ⚠ review |
| 5 | Santechnikai, santechnikos darbai | DISTINCT TAX | `tax_1a07e082398a6bcbc7` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 31 | 31 | ⚠ review |
|  |  |  | `tax_e2f786f0257a2829d7` | tax_ | service | ✓ | 0 | 1 | 1 | 1 | 25 | 28 | ⚠ review |
|  |  |  | `af1c4d3e7bb1` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 5 | 5 | ⚠ review |
|  |  |  | `6a92df9c8507` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 6 | Metalinės tvoros | DISTINCT TAX | `tax_42ac3ace549c053342` | tax_ | service | ✓ | 0 | 1 | 1 | 1 | 0 | 3 | ⚠ review |
|  |  |  | `26b1678f3602` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_c9367ceb2d429a6a20` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 7 | Autobusų, limobusų nuoma | DISTINCT TAX | `tax_e01231148e17b9c913` | tax_ | service | ✓ | 0 | 1 | 1 | 1 | 0 | 3 | ⚠ review |
|  |  |  | `dc123afd9715` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_ed6b91f94cb87307fc` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_9743c1252fc541f3c1` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_7b5a676ca39cb7347d` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_cdf171cd0b05fba034` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_45d05cca29717752c9` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 8 | Statybinių atliekų išvežimas | DISTINCT TAX | `tax_15817ea4e7159e853d` | tax_ | service | ✓ | 0 | 1 | 1 | 1 | 0 | 3 | ⚠ review |
|  |  |  | `tax_9b23a16aa1bc44834f` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_760b748ecd25b5fda4` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 9 | Statybos darbų techninė priežiūra | DISTINCT TAX | `tax_7a4aab311bab789879` | tax_ | service | ✓ | 0 | 1 | 1 | 1 | 0 | 3 | ⚠ review |
|  |  |  | `tax_7c2cf88f6d0b868e0d` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_1113f7286871c3a5ef` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_f8db4bd6e51874b56f` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 10 | Kalviai, kalvystės darbai | DISTINCT TAX | `tax_cb81cda62ceee2d43d` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 10 | 11 | ⚠ review |
|  |  |  | `tax_e8a705569a99dea88c` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 10 | 11 | ⚠ review |
|  |  |  | `tax_1554dec34b00fdbe5e` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 10 | 10 | ⚠ review |
|  |  |  | `90ae7edece9a` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 11 | Tvoros, vartai, montavimas | DISTINCT TAX | `tax_fe045bc5ac0d7cd725` | tax_ | service | ✓ | 2 | 0 | 0 | 0 | 11 | 13 | ⚠ review |
|  |  |  | `tax_da0dfa3c4f75b693e5` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 11 | 11 | ⚠ review |
|  |  |  | `123ca25d764c` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `48fd00e633bd` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_de8babe085eb9487e0` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 12 | Reklamos paslaugos | DISTINCT TAX | `tax_4bfc91c511f0cec352` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 21 | 22 | ⚠ review |
|  |  |  | `tax_08e34063e3b5222067` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 21 | 22 | ⚠ review |
|  |  |  | `5f1ee3dcec2c` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `855c03234632` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 13 | Teisinės paslaugos | DISTINCT TAX | `svc-teisines-paslaugos` | svc- | — | ✗ | 0 | 1 | 1 | 0 | 0 | 3 | ⚠ review |
|  |  |  | `9d572cc2cd5c` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_efd746b9f62faa25dd` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_d17d83e21ee16a8f4b` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 14 | Valymo paslaugos | SAFE CONSOLIDATE | `aee01c2083ba` | barehex | root | ✓ | 1 | 1 | 1 | 0 | 13 | 30 | merge |
|  |  |  | `tax_94b9f02499107422d1` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 20 | 20 | **KEEP** |
| 15 | Medžio darbai, staliai | DISTINCT TAX | `tax_d5f5718e15583a2c4b` | tax_ | service | ✓ | 0 | 1 | 0 | 0 | 20 | 21 | ⚠ review |
|  |  |  | `8390d6315aba` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 8 | 8 | ⚠ review |
|  |  |  | `svc-medzio-darbai-staliai` | svc- | — | ✗ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_171334bbe847154a91` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 16 | Vidaus apdailos darbai | DISTINCT TAX | `tax_dc3e297404c5ba37cf` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 33 | 34 | ⚠ review |
|  |  |  | `9e092bdf1296` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 25 | 25 | ⚠ review |
|  |  |  | `tax_f0423b69f5ff96e2c9` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 17 | Automobilių nuoma | DISTINCT TAX | `tax_7e62d8e64b1e52fdd9` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 13 | 14 | ⚠ review |
|  |  |  | `tax_ca8807453e66202ecc` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 13 | 13 | ⚠ review |
|  |  |  | `tax_47b420900551f4e7f5` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 13 | 13 | ⚠ review |
|  |  |  | `be7738cb8855` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `svc-automobiliu-nuoma` | svc- | — | ✗ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 18 | Skardinės tvoros | DISTINCT TAX | `tax_04334f449b240e2a62` | tax_ | service | ✓ | 0 | 1 | 0 | 0 | 0 | 1 | ⚠ review |
|  |  |  | `0c1d2bcc4416` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_cb578297742254f23d` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 19 | Trinkelių klojimas | DISTINCT TAX | `tax_ba0825112b43636f5d` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 5 | 6 | ⚠ review |
|  |  |  | `9d3b07d0be74` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `37ba0559f8bb` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `svc-trinkeliu-klojimas` | svc- | — | ✗ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_45f5b21bfae7730079` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_ce4a00a1d6997b108c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 20 | Durų montavimas | DISTINCT TAX | `tax_40b45cfd3e30894cf4` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 0 | 1 | ⚠ review |
|  |  |  | `b3b22894e9c8` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_1d400cc01c5cb21c91` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_7743466f0f8d326f1c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_3b14dec093753ae16d` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |

## 6. Top 50 duplicate groups by total usage
| # | name | class | id | space | pageType | act | prov | reqCat | reqDir | slug | child | use | role |
|--|--|--|--|--|--|--|--:|--:|--:|--:|--:|--:|--|
| 1 | Statybos, apdaila | SAFE CONSOLIDATE | `tax_97d19f4a1fc360211c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 66 | 620 | **KEEP** |
|  |  |  | `c000215c8f5e` | barehex | root | ✓ | 2 | 5 | 5 | 0 | 164 | 390 | merge |
| 2 | Paslaugos verslui | SAFE CONSOLIDATE | `0caacaf2c750` | barehex | root | ✓ | 2 | 0 | 0 | 0 | 174 | 510 | merge |
|  |  |  | `tax_9ecd1a28263cc2dcc0` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 49 | 438 | **KEEP** |
|  |  |  | `af16ae6c3786` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 3 | Buitinės paslaugos | SAFE CONSOLIDATE | `tax_25805794572e3d8bca` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 38 | 312 | **KEEP** |
|  |  |  | `83ee8528ee0f` | barehex | root | ✓ | 2 | 0 | 0 | 0 | 67 | 137 | merge |
| 4 | Renginiai, šventės | SAFE CONSOLIDATE | `tax_7798fa7870b99e2861` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 43 | 355 | **KEEP** |
|  |  |  | `83cf6038661f` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 21 | 21 | merge |
| 5 | Tradiciniai amatai | SAFE CONSOLIDATE | `tax_65208a261ebf1dc745` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 27 | 194 | **KEEP** |
|  |  |  | `2569925a7bda` | barehex | root | ✓ | 0 | 0 | 0 | 0 | 51 | 102 | merge |
| 6 | Mokymai, kursai, kalbos | SAFE CONSOLIDATE | `tax_75c83071a9cb3f8e93` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 39 | 194 | **KEEP** |
|  |  |  | `83201c56a536` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 36 | 36 | merge |
| 7 | Transportas | SAFE CONSOLIDATE | `tax_aea7bf1412890619a2` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 32 | 229 | **KEEP** |
|  |  |  | `f0a3f13f2c98` | barehex | leaf | ✓ | 0 | 0 | 0 | 1 | 0 | 1 | merge |
| 8 | Aplinka, sodas | SAFE CONSOLIDATE | `tax_8550aaef8c0536c502` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 16 | 120 | **KEEP** |
|  |  |  | `5ca1bb13b074` | barehex | root | ✓ | 1 | 4 | 4 | 0 | 39 | 106 | merge |
| 9 | Interjeras, baldai | SAFE CONSOLIDATE | `tax_f1c6800e44ec261448` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 18 | 134 | **KEEP** |
|  |  |  | `fe8becc99a96` | barehex | root | ✓ | 0 | 0 | 0 | 0 | 25 | 69 | merge |
| 10 | Grožio paslaugos | SAFE CONSOLIDATE | `tax_b9ee08060556204c7b` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 18 | 167 | **KEEP** |
|  |  |  | `e3107d7bc76a` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 11 | Internetas, IT | SAFE CONSOLIDATE | `tax_6e656e71e44fd443ba` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 18 | 150 | **KEEP** |
|  |  |  | `efcdd2a380fd` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 10 | 10 | merge |
| 12 | Nuomos paslaugos | SAFE CONSOLIDATE | `tax_2f2ede57901754060b` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 32 | 142 | **KEEP** |
|  |  |  | `2d221f76cd72` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 13 | Reklama, dizainas, spauda | SAFE CONSOLIDATE | `tax_c8185538fa46e0964f` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 7 | 108 | **KEEP** |
|  |  |  | `41c016d879ea` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 14 | Sveikata, gydymas | SAFE CONSOLIDATE | `tax_b9229bebd8200d376c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 20 | 99 | **KEEP** |
|  |  |  | `65cf5cea0953` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 15 | Dailė, menai, keramika | SAFE CONSOLIDATE | `tax_25a610eb543be51112` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 11 | 96 | **KEEP** |
|  |  |  | `b7bcbe1961a2` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 16 | Apranga, papuošalai, aksesuarai | SAFE CONSOLIDATE | `tax_e3fde33999887987da` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 12 | 93 | **KEEP** |
|  |  |  | `1189e68f01b9` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 17 | Grafikos dizaineriai | DISTINCT TAX | `f7e90cbe0fcf` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 29 | 29 | ⚠ review |
|  |  |  | `tax_8079d04b3b60de5bbc` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 21 | 21 | ⚠ review |
|  |  |  | `tax_54a0de3e0d4ec83920` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 21 | 21 | ⚠ review |
|  |  |  | `tax_f0cc11420ae1a06b0e` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 21 | 21 | ⚠ review |
|  |  |  | `742091be4642` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 18 | Laisvalaikis, pramogos, turizmas | SAFE CONSOLIDATE | `tax_260df053df6d4a309b` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 21 | 72 | **KEEP** |
|  |  |  | `e4507cd20f5e` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 17 | 17 | merge |
| 19 | Vertėjai, vertimų biurai | DISTINCT TAX | `tax_b67f0827788ebd2f46` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 28 | 28 | ⚠ review |
|  |  |  | `tax_9c84fbdc413f1bfbf0` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 28 | 28 | ⚠ review |
|  |  |  | `28a329736438` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 24 | 24 | ⚠ review |
| 20 | Santechnikai, santechnikos darbai | DISTINCT TAX | `tax_1a07e082398a6bcbc7` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 31 | 31 | ⚠ review |
|  |  |  | `tax_e2f786f0257a2829d7` | tax_ | service | ✓ | 0 | 1 | 1 | 1 | 25 | 28 | ⚠ review |
|  |  |  | `af1c4d3e7bb1` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 5 | 5 | ⚠ review |
|  |  |  | `6a92df9c8507` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 21 | Aplinkos tvarkymas, apželdinimas | DISTINCT TAX | `tax_ce3302ef51ee009431` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 22 | 22 | ⚠ review |
|  |  |  | `tax_bbe1d0f7380d3ffd4c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 22 | 22 | ⚠ review |
|  |  |  | `2893c81b9750` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 17 | 17 | ⚠ review |
|  |  |  | `3a92858ccb04` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 22 | Vidaus apdailos darbai | DISTINCT TAX | `tax_dc3e297404c5ba37cf` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 33 | 34 | ⚠ review |
|  |  |  | `9e092bdf1296` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 25 | 25 | ⚠ review |
|  |  |  | `tax_f0423b69f5ff96e2c9` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 23 | Sportas, treniruotės | SAFE CONSOLIDATE | `tax_a8decaad2f1bc1e4f2` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 16 | 50 | **KEEP** |
|  |  |  | `0d35cff287c5` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 1 | 1 | merge |
| 24 | Valymo paslaugos | SAFE CONSOLIDATE | `aee01c2083ba` | barehex | root | ✓ | 1 | 1 | 1 | 0 | 13 | 30 | merge |
|  |  |  | `tax_94b9f02499107422d1` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 20 | 20 | **KEEP** |
| 25 | Šventinės įrangos nuoma | DISTINCT TAX | `tax_c7030ee278201da374` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 25 | 25 | ⚠ review |
|  |  |  | `tax_3aa164c822cee6649c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 25 | 25 | ⚠ review |
|  |  |  | `1ed9219fdbd1` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `svc-sventines-irangos-nuoma` | svc- | — | ✗ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 26 | Reklamos gamyba | DISTINCT TAX | `be60f8287e6f` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 16 | 16 | ⚠ review |
|  |  |  | `tax_349c40d97707f3c04c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 16 | 16 | ⚠ review |
|  |  |  | `tax_f9c060dc25125ebbd2` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 16 | 16 | ⚠ review |
| 27 | Advokatai, teisininkai | SAFE CONSOLIDATE | `tax_4b18375bc50b950b8b` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 24 | 24 | **KEEP** |
|  |  |  | `c697f9adaa16` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 23 | 23 | merge |
|  |  |  | `e2fe71feed7f` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
|  |  |  | `7822579bf241` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 28 | Reklamos paslaugos | DISTINCT TAX | `tax_4bfc91c511f0cec352` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 21 | 22 | ⚠ review |
|  |  |  | `tax_08e34063e3b5222067` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 21 | 22 | ⚠ review |
|  |  |  | `5f1ee3dcec2c` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `855c03234632` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 29 | Baldų gamyba | SAFE CONSOLIDATE | `tax_3a315754a860abe2aa` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 23 | 23 | **KEEP** |
|  |  |  | `4d3f6a24c81e` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 19 | 19 | merge |
|  |  |  | `svc-baldu-gamyba` | svc- | — | ✗ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 30 | Interneto svetainių kūrimas | DISTINCT TAX | `fa7a8898fcf7` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 20 | 20 | ⚠ review |
|  |  |  | `tax_edd9ee64d574a8ab2c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 11 | 11 | ⚠ review |
|  |  |  | `tax_47eb8b9e709bd74fe5` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 11 | 11 | ⚠ review |
|  |  |  | `8676ce2daf86` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `svc-interneto-svetainiu-kurimas` | svc- | — | ✗ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 31 | Automobilių nuoma | DISTINCT TAX | `tax_7e62d8e64b1e52fdd9` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 13 | 14 | ⚠ review |
|  |  |  | `tax_ca8807453e66202ecc` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 13 | 13 | ⚠ review |
|  |  |  | `tax_47b420900551f4e7f5` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 13 | 13 | ⚠ review |
|  |  |  | `be7738cb8855` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `svc-automobiliu-nuoma` | svc- | — | ✗ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 32 | Pramogos vaikams | DISTINCT TAX | `tax_1ec2d016c1292ce83b` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 19 | 19 | ⚠ review |
|  |  |  | `tax_d57c91810119645542` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 19 | 19 | ⚠ review |
|  |  |  | `1c6e34f35d0f` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 33 | Programuotojai | DISTINCT TAX | `tax_b40d4a9eb990c3b90a` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 18 | 18 | ⚠ review |
|  |  |  | `tax_b9ffe4e3a5cae50103` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 18 | 18 | ⚠ review |
|  |  |  | `cd556fe47ecc` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `85247bed51ac` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 34 | Fotografai | SAFE CONSOLIDATE | `tax_1e196f95efec3ad05b` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 17 | 17 | **KEEP** |
|  |  |  | `e7eb5f419ea8` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 16 | 16 | merge |
|  |  |  | `83b8003618a1` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 35 | Kalviai, kalvystės darbai | DISTINCT TAX | `tax_cb81cda62ceee2d43d` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 10 | 11 | ⚠ review |
|  |  |  | `tax_e8a705569a99dea88c` | tax_ | service | ✓ | 1 | 0 | 0 | 0 | 10 | 11 | ⚠ review |
|  |  |  | `tax_1554dec34b00fdbe5e` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 10 | 10 | ⚠ review |
|  |  |  | `90ae7edece9a` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 36 | Architektai, projektavimas | DISTINCT TAX | `tax_c50aecac6da0a1def3` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 16 | 16 | ⚠ review |
|  |  |  | `tax_3a1a38253c9aff8c07` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 16 | 16 | ⚠ review |
|  |  |  | `45036dfb975e` | barehex | unknown | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `27bedd919997` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 37 | Srautinis valymas | DISTINCT TAX | `tax_4e49e83e0576704c14` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 15 | 15 | ⚠ review |
|  |  |  | `tax_30a946c43c85be9709` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 15 | 15 | ⚠ review |
|  |  |  | `fba9ef1e873f` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `0b7be9b80f44` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_a96e9bd9d0a6d95af9` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 38 | Spaudos paslaugos | DISTINCT TAX | `tax_cdda7e4fab0bd58efc` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 11 | 11 | ⚠ review |
|  |  |  | `tax_1d6f8bc5826f3cfcb7` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 11 | 11 | ⚠ review |
|  |  |  | `e13707f15b5b` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 8 | 8 | ⚠ review |
| 39 | Buitinės technikos remontas | SAFE CONSOLIDATE | `tax_ea10a45ae9a37b6a7d` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 30 | 30 | **KEEP** |
|  |  |  | `3c1bda422a08` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
|  |  |  | `15b0a52f1f19` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 40 | Kosmetologės | SAFE CONSOLIDATE | `tax_7e9dd5f8b9cdb3f424` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 30 | 30 | **KEEP** |
|  |  |  | `edd9dc125576` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 41 | Medžio darbai, staliai | DISTINCT TAX | `tax_d5f5718e15583a2c4b` | tax_ | service | ✓ | 0 | 1 | 0 | 0 | 20 | 21 | ⚠ review |
|  |  |  | `8390d6315aba` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 8 | 8 | ⚠ review |
|  |  |  | `svc-medzio-darbai-staliai` | svc- | — | ✗ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_171334bbe847154a91` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 42 | Metalo gaminiai, suvirintojai | SAFE CONSOLIDATE | `tax_8d6fe7b5b0fa43938d` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 17 | 17 | **KEEP** |
|  |  |  | `1eb70efe7e9f` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 11 | 11 | merge |
| 43 | Skalda, smėlis, žvyras, juodžemis | DISTINCT TAX | `tax_b61d05c3c5aafe089f` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 14 | 14 | ⚠ review |
|  |  |  | `tax_3a049234b97fef767c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 14 | 14 | ⚠ review |
|  |  |  | `243dec8d847c` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_6d42c53a88849abd76` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 44 | Langai, durys: gamyba, montavimas | DISTINCT TAX | `tax_d53ca0ad794e715e5f` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 14 | 14 | ⚠ review |
|  |  |  | `tax_40d5f6b75d833a681d` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 14 | 14 | ⚠ review |
|  |  |  | `d148ce2b5570` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `tax_ea5e56d385e1d178e3` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 45 | Statybos darbai | SAFE CONSOLIDATE | `tax_9ead377c9574437eb7` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 28 | 28 | **KEEP** |
|  |  |  | `ef64d956b05d` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
|  |  |  | `a843103745f2` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 46 | Maistas, konditerija | SAFE CONSOLIDATE | `tax_5bcff482a5f879a10a` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 5 | 26 | **KEEP** |
|  |  |  | `9729aa35e93a` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 1 | 1 | merge |
| 47 | Kompiuterių remontas | DISTINCT TAX | `tax_9f2f2c5ef3ee1d4ca2` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 9 | 9 | ⚠ review |
|  |  |  | `tax_281f03e83661b442d1` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 9 | 9 | ⚠ review |
|  |  |  | `tax_018ac63c62e49f438e` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 9 | 9 | ⚠ review |
|  |  |  | `41888b4178f2` | barehex | leaf | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `848c0e5768cf` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 48 | Iliustruotojai | DISTINCT TAX | `tax_2ad3f5f5766e2d95b5` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 9 | 9 | ⚠ review |
|  |  |  | `tax_e9b0d4d36e0038d24e` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 9 | 9 | ⚠ review |
|  |  |  | `tax_4d53b72fcf0419698b` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 9 | 9 | ⚠ review |
|  |  |  | `1748b00ae94e` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
|  |  |  | `66ebd47009ea` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | ⚠ review |
| 49 | Prekyba | SAFE CONSOLIDATE | `tax_b90a637fce05fae84c` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 1 | 26 | **KEEP** |
|  |  |  | `e997daa43261` | barehex | hub | ✓ | 0 | 0 | 0 | 0 | 0 | 0 | merge |
| 50 | Kineziterapeutai | DISTINCT TAX | `tax_88d5c3ee55dfd577d1` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 13 | 13 | ⚠ review |
|  |  |  | `tax_c636ea9021bee7fc1e` | tax_ | service | ✓ | 0 | 0 | 0 | 0 | 13 | 13 | ⚠ review |

_(All 1210 groups + every member + counts: companion CSV.)_

## 7. Recommended IMMEDIATE mapper fix (Phase A — code only, no DB change, behind `ROUTING_SHADOW_ENABLED`)
Make the index target the **live** taxonomy and break residual ties deterministically toward `tax_`. Change only `src/lib/routing/shadow.ts` (`loadCategoryNameIndex`); leave pure `taxonomy-map.ts` as-is.
```ts
const [categories, aliases] = await Promise.all([
  prisma.category.findMany({
    where: { pageType: "service", isActive: true },          // was: no filter — stops barehex/svc-/leaf from ever winning
    select: { id: true, name: true, slug: true, externalSlug: true },
  }),
  prisma.categoryAlias.findMany({ select: { categoryId: true, aliasName: true, aliasSlug: true } }),
]);
// deterministic first-writer = tax_ (so any residual collision can't land on a non-tax id)
const ordered = [...categories].sort((a, b) => (a.id.startsWith("tax_") ? 0 : 1) - (b.id.startsWith("tax_") ? 0 : 1));
const index = buildCategoryNameIndex(ordered, aliases);
```
This immediately removes the **cross-id-space** misrouting (SAFE_CONSOLIDATE + LEGACY_ONLY collisions) and makes the choice stable. It does **NOT** resolve **DISTINCT_TAX** ambiguity — among multiple valid `tax_` nodes the name is still ambiguous; the mapper will pick one deterministically but it may not be the intended branch. That requires a contract change (§8 Phase A2). Safe to ship now: shadow-only, verify against the CSV, no data touched.

## 8. Proposed phased migration
- **Phase A — mapper fix (code only).** As §7. No DB writes. Re-run the shadow replay; for SAFE/TRUE-DUP groups confirm `name→id` now hits the canonical `tax_` id. Ship behind `ROUTING_SHADOW_ENABLED`.
- **Phase A2 — routing contract (design, prerequisite for activation).** Because **821** names are genuinely ambiguous, v4 must not route on bare names. Options: (a) v4 emits **slug or stable id / full path** instead of name; (b) mapper returns **all** matching active `tax_` ids for a name and dispatch fans out to the union (wider, but never a dead id); (c) disambiguate by request context (parent/root hint). Decide before activating v4.
- **Phase B — reference backfill (DB, reversible, batched, dry-run first).** ONLY the **389** mergeable groups. Repoint references (§4) to the canonical id, **deleting** unique-collision rows; rewrite the `ServiceRequest.category` slug; exclude `credit_transactions`. **Do not touch** DISTINCT_TAX / LEGACY_ONLY. Idempotent script writing a pre-image journal.
- **Phase C — deactivate / archive.** Once a merged id has zero inbound refs, `isActive=false` (reversible); archive `barehex`/`svc-`. Hard-delete only after a stability window.
- **Phase D — guard recurrence.** Add a partial unique index on `fold(name)` scoped to `isActive AND pageType='service' AND <same parent>` (so TRUE_DUP_TAX can't recur but legitimate cross-branch reuse stays allowed), and/or a `canonicalCategoryId` self-pointer + CI check. Retire the import that created the `barehex`/`svc-` spaces.

## 9. Exact files to change later (NOT changed here)
- `src/lib/routing/shadow.ts` — `loadCategoryNameIndex` (Phase A filter + sort).
- `src/lib/routing/taxonomy-map.ts` — Phase A2: optionally return all matching ids / accept a priority comparator.
- `src/lib/routing/multi-routing-v4.ts` (+ the research repo's contract) — Phase A2 if v4 emits slug/id/path.
- `prisma/schema.prisma` + `prisma/manual-migrations/` — Phase B backfill + Phase D guard (this audit writes none).
- `scripts/backfill-category-dedup.ts` (new, dry-run default) — mirrors existing backfill scripts.

## 10. DB tables affected (summary)
`categories` (self `parentId`/`rootId`, `isActive`), `provider_profile_categories`, `service_request_categories`, `service_requests` (`categoryId` + `category` slug), `category_aliases`, `supplier_category_links`. `credit_transactions` is a soft ledger ref — leave untouched.

## 11. Rollback plan
- **Phase A / A2** (code): revert the commit or set `ROUTING_SHADOW_ENABLED=false`. No data touched.
- **Phase B** (data): the script writes a pre-image journal (`table, pk, oldCategoryId` for every repoint + every deleted collision row); rollback replays it in reverse. The CSV is the full pre-state. Transaction per batch; abort the whole batch on any constraint error (never a partial group).
- **Phase C**: `isActive` flip is reversible; no hard-delete until Phase B is stable for a defined window.
- **Phase D**: drop the new index to revert the guard.

---
_Generated read-only from production. Verify canonical picks — especially every DISTINCT_TAX group — against the CSV before authoring any migration._
