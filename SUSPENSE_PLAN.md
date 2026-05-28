# Granular Suspense Boundaries — Implementation Plan

> Planning document. **No code in this branch.** A separate executor agent will
> pick one page at a time off this plan and ship a focused PR per page (or
> per cluster). Read [NOTES.md](NOTES.md) "Cache Components (PPR) įjungta
> production'e" entry first — that is the baseline this plan extends.

---

## Summary

- **Target pages:** 12 actual pages (the brief lists 13 but `/tiekejas/kreditai`
  has no `page.tsx` — only `src/app/api/tiekejas/kreditai/route.ts`).
- **New independent Suspense boundaries proposed:** ~33 across the 12 pages
  (~3 per page on average; details inline).
- **Architectural prerequisite:** 7 of the 12 pages are `"use client"`
  end-to-end with `fetch()`-in-`useEffect`. Server `<Suspense>` around them
  does nothing — they must first become thin server page.tsx + small client
  islands (the "Task F" pattern). Without that, the plan collapses into
  "wait for one client fetch, render everything at once" — the exact problem
  we're solving.
- **New skeleton components to create:** 12 reusable shapes under
  `src/components/ui/skeletons/` (named in §Cross-cutting changes).
- **Estimated effort:** ~22-30 focused hours across **7 PRs** (one per cluster
  or per high-value page). Detail in §Execution order + §Merge strategy.
- **Hard constraint:** every `redirect()` / `notFound()` / ownership check
  moves into a `<SessionGate />` async component *outside* the data
  Suspenses, so unauthorized users never see partial UI — the pattern at
  [src/app/paskyra/zinutes/page.tsx:18](src/app/paskyra/zinutes/page.tsx:18).

---

## Corrections (post-review 2026-05-28) — these OVERRIDE the code samples below

A review verified this plan against the live code (pattern classifications,
client-component line counts, `getServiceCategoryGroups` `'use cache'`,
ThreadChat realtime, every `loading.tsx`, the `Skeleton` API — all confirmed
accurate). Five issues in the **code samples** were found and resolved here.
Where an inline §Page sample conflicts with a rule below, **the rule wins.**

### C1 — Canonical page shell recipe (governs every authenticated page.tsx)

The async `SessionGate` calls `getServerSession` (dynamic), so under
`cacheComponents` it MUST sit inside a `<Suspense>` — exactly why the existing
[paskyra/zinutes/page.tsx](src/app/paskyra/zinutes/page.tsx:20) wraps its gate
in `<Suspense fallback={null}>`. Static chrome MUST sit OUTSIDE the gate so it
paints with the prerendered shell:

```tsx
export default function SomePage() {
  return (
    <div className="...container...">
      {/* STATIC chrome — paints with the prerendered shell. Headers,
          breadcrumbs, static titles, "Nauja" buttons go HERE, never inside
          the gate. (Role-derived text like a PROVIDER-vs-USER title may stay
          inside the gate — the session read resolves in ~30-80ms.) */}
      <PageHeader />

      {/* Gate is async → must be inside Suspense. fallback = null (header
          already painted) or a light full-section skeleton. */}
      <Suspense fallback={null}>
        <SessionGate requireRole="PROVIDER">
          {(userId) => (
            <>
              {/* one Suspense per independent query */}
              <Suspense fallback={<XSkeleton />}><X userId={userId} /></Suspense>
              <Suspense fallback={<YSkeleton />}><Y userId={userId} /></Suspense>
            </>
          )}
        </SessionGate>
      </Suspense>
    </div>
  );
}
```

Public pages (`/uzklausos/sekti/[id]`) skip the gate — sections fetch by token
directly, session-dependent UI is a `"use client"` island.

### C2 — Do NOT put `searchParams` in a Suspense `key` (fixes Pages 2, 7, 9)

The samples for `/tiekejas/uzklausos`, `/tiekejas/atsakymai`, and
`/paskyra/uzklausos` write `key={`${searchParams.page ?? "1"}-…`}`.
`searchParams` is a `Promise`, so `.page` is `undefined` at runtime (the key
never changes — the "fresh stream on filter change" never fires) AND it is a
TS-strict compile error. Reading the resolved value would force an `await` in
the page body, making the whole page dynamic (no static shell).

**Resolution: drop the `key` entirely.** Pass the `searchParams` Promise into
the async section and `await` it there:

```tsx
// page.tsx (stays a static shell — no await here)
<Suspense fallback={<RequestsListSkeleton />}>
  <RequestsList userId={userId} searchParams={searchParams} />
</Suspense>

// sections/RequestsList.tsx (async server component)
export async function RequestsList({ userId, searchParams }: {
  userId: string; searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const sp = await searchParams;        // await HERE, not in the page
  const page = Number(sp.page ?? "1");
  // …query…
}
```

On filter change (a `<Link href="?status=…">` navigation) Next re-renders the
section inside a transition and keeps the old list visible until the new one is
ready — smoother than a key-forced skeleton flash, and it matches the
"don't pre-build the optimistic path" guidance in §Page 2 Risk F.

### C3 — SessionGate has ONE home; PR dependency corrected

SessionGate lives at **`src/components/auth/SessionGate.tsx`** (generic, takes
`requireRole?`). Drop the alternate `src/app/tiekejas/SessionGate.tsx`
suggestion — one file, imported by both `/tiekejas/*` and `/paskyra/*`.

Consequence for §Merge strategy: **PR 1 and PR 2 are independent; PRs 3-7 all
depend on PR 1** (they import SessionGate + the skeleton lib). The line "PRs 1,
2, 3 are fully independent" is wrong — PR 3 needs PR 1. Ship PR 1 first, then
2-7 can parallelize.

### C4 — `/tiekejas` dashboard: restructure only, no new sections

§Page 1 §A lists "Recent matching requests" (item 9) as a list. Verified: today
the dashboard renders only a *count* (`stats.matchingRequests` at
[ProviderDashboardClient.tsx:699](src/app/tiekejas/ProviderDashboardClient.tsx:699)),
no list. Same caution for "Recent reviews" (item 10) — confirm it renders today
before building. **The Suspense PR restructures only what already renders.** Any
net-new section is deferred to a separate feature PR and tracked in NOTES.md —
a performance PR must not also ship a feature (harder to review, harder to roll
back).

### C5 — Minor

- `Skeleton` is a **default** export
  (`import Skeleton from "@/components/ui/Skeleton"`); `SkeletonCard` is named.
  New skeleton files import accordingly.
- The Summary's "7 of 12 pages are `"use client"` end-to-end" is loose: only 3
  page.tsx are actually `"use client"` (`/tiekejas/zinutes`,
  `/tiekejas/profilis`, `/paskyra/uzklausos`); the rest are thin server shells
  wrapping a fat client child that fetches in `useEffect`. The per-page analysis
  is unaffected.

---

## Background — what we ship today vs. what we want

### Today (post Phase 1-5 Cache Components migration)

The root [src/app/layout.tsx](src/app/layout.tsx) is Cache-Components-ready
— [Header](src/app/layout.tsx:95) and
[MobileBottomNav](src/app/layout.tsx:100) each sit behind their own
`<Suspense fallback={null}>`, so grid background, fonts, and chrome paint
from the static prerender at ~0-100ms.

The page.tsx files for the per-user routes vary widely:

| Pattern                              | Pages                                                                                                                                              | Behavior today                                                                                              |
|--------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------|
| **A. Thin server + one outer `<Suspense>` around a fat client component** | [/tiekejas](src/app/tiekejas/page.tsx), [/tiekejas/uzklausos](src/app/tiekejas/uzklausos/page.tsx), [/tiekejas/uzklausos/[id]](src/app/tiekejas/uzklausos/[id]/page.tsx), [/tiekejas/zinutes/[id]](src/app/tiekejas/zinutes/[id]/page.tsx), [/tiekejas/atsakymai](src/app/tiekejas/atsakymai/page.tsx), [/uzklausos/sekti/[id]](src/app/uzklausos/sekti/[id]/page.tsx) | Skeleton from `fallback` paints immediately, then the **client component does its own `fetch()` in `useEffect`**, so the skeleton stays up for the entire round-trip. No server-side data ever streams. |
| **B. Server `<Suspense>` around an async server component that does `getServerSession` + Prisma fetch, then renders a thin client form** | [/paskyra/profilis](src/app/paskyra/profilis/page.tsx), [/paskyra/zinutes](src/app/paskyra/zinutes/page.tsx) (gate only)                            | Real PPR: shell prerenders, gate streams, form hydrates with server-fetched props. **This is the pattern to replicate.** |
| **C. `"use client"` end-to-end, no Suspense at all**                       | [/tiekejas/zinutes](src/app/tiekejas/zinutes/page.tsx), [/tiekejas/profilis](src/app/tiekejas/profilis/page.tsx), [/paskyra/uzklausos](src/app/paskyra/uzklausos/page.tsx) | Server can't help. Skeleton-vs-spinner is the only knob until you refactor. |
| **D. Mature server + nested Suspenses for slow sections**                  | [/meistrai/[slug]](src/app/meistrai/[slug]/page.tsx) — hero from cached `getProviderProfile()`, reviews + similar-providers each in own `<Suspense>` | The model for what every per-user page should eventually look like. |

### What we want

Multi-stage fill-in: chrome from CDN (~0-100ms) → fast streams (credit
pill, greeting) at ~100-300ms → heavier streams (lists, stats) at
~300-800ms → AI sections (follow-ups, copilot) last, each on its own
boundary. User can click nav and scroll throughout — nothing blocks on a
single slow query.

The unifying principle: **one Suspense per independent query.**
Co-located queries (e.g. a stats tile that `Promise.all`s 4 cheap counts)
share a boundary; orthogonal queries (stats vs. recent-requests vs.
follow-ups) do not.

**When NOT to add a boundary**: already-cached data (`"use cache"`, <50ms
warm — render sync), pure-static sections (titles, breadcrumbs — no fetch),
and anything that resolves under ~200ms (perceived as instant, no skeleton
needed). The boundary overhead isn't worth it in these cases.

---

## Page 1: `/tiekejas` (provider dashboard root)

**Current state**: [src/app/tiekejas/page.tsx](src/app/tiekejas/page.tsx:1-12)
is a thin server shell with a single
`<Suspense fallback={<DashboardSkeleton />}>` wrapping
[ProviderDashboardClient.tsx](src/app/tiekejas/ProviderDashboardClient.tsx)
(878 lines, `"use client"`). The client does `fetch("/api/tiekejas/stats")` +
`fetch("/api/tiekejas/follow-ups")` + `fetch("/api/tiekejas/zinutes/unread-count")`
in `useEffect` on mount. **Skeleton paints, then one big monolithic data blob
arrives 200-1000ms later, then the entire dashboard renders at once.**
Pattern A.

This is the highest-impact page on the platform — every provider hits it
multiple times per day. **Top execution priority.**

### A. Section inventory

1. **Page header** — title "Valdymo panelė" + subtitle (greeting using
   `session.user.name`)
2. **Account info card** — avatar (with story-entry button), name, email,
   verification + active badges
3. **Email-verification banner** (conditional — shown if `!emailVerified`)
4. **Pending-claim alert** (conditional — shown if a claim request is
   pending)
5. **Account-suspension alert** (conditional — shown if `!isActive`)
6. **Next-action CTA card** — contextual link ("complete profile", etc.)
7. **Stats grid (4 tiles)** — matching-requests count, my-responses count,
   credit balance, accepted count
8. **Profile-completeness bar** — progress + missing items (hidden at 100%)
9. **Recent matching requests** — top 3-5 leads from the matching queue
   (UX win to add; currently only a count tile)
10. **Recent reviews** (if any) — last 2-3 reviews received
11. **AI follow-up suggestions card**
    ([ProviderFollowUpsCard.tsx](src/app/tiekejas/ProviderFollowUpsCard.tsx)) —
    stalled threads, AI-classified
12. **Quick-links grid (4-6 cards)** — Requests, Messages, Edit Profile,
    Public Profile, Catalog Profiles, Credits
13. **Story modal** (overlay, opens on avatar click — fetches on demand)

### B. Data dependency per section

| # | Section                  | Source                                                    | Session-dep | Cached?   | Cost              |
|---|--------------------------|-----------------------------------------------------------|-------------|-----------|-------------------|
| 1 | Page header              | `session.user.name`                                       | yes         | n/a       | <1ms              |
| 2 | Account info card        | `prisma.user.findUnique({ id, name, email, image, emailVerified, providerProfile: { isActive, slug } })` | yes | no | ~50-100ms       |
| 3 | Email-verif banner       | `user.emailVerified` (from 2)                             | yes         | shared    | included          |
| 4 | Pending-claim alert      | `prisma.claimRequest.findFirst({ providerId, status: "PENDING" })` | yes | no | ~50ms        |
| 5 | Suspension alert         | `providerProfile.isActive` (from 2)                       | yes         | shared    | included          |
| 6 | Next-action CTA          | derived from §7 + §8 — pure function                      | yes         | n/a       | <1ms              |
| 7 | Stats grid               | 4 parallel `prisma.X.count(...)` + `creditBalance` field + `expandToMatchSet()` | yes | no | ~250-450ms (matching requests is the slow query — touches taxonomy) |
| 8 | Profile completeness     | derived from `providerProfile.{description, headline, services, location, phone, images, categories}` | yes | no | ~150-250ms (one Prisma read) |
| 9 | Recent matching requests | `prisma.serviceRequest.findMany({ where: matchSet, take: 5, ... })` | yes | no | ~300-500ms     |
| 10 | Recent reviews          | `prisma.review.findMany({ where: { providerId, moderationStatus: APPROVED }, orderBy: createdAt desc, take: 3 })` | yes | no | ~100-150ms |
| 11 | AI follow-ups           | `prisma.response.findMany() + prisma.directInquiry.findMany() + LLM classification` | yes | no | **300-1500ms (slowest section, includes optional AI call)** |
| 12 | Quick-links grid         | STATIC (some items conditionally disabled based on §7)   | derived     | n/a       | <1ms              |
| 13 | Story modal              | `prisma.providerStory.findMany()` — **on-demand**         | yes         | no        | ~100-250ms (opens lazily) |

### C. Proposed Suspense layout

```tsx
// src/app/tiekejas/page.tsx
import { Suspense } from "react";
import { SessionGate } from "./SessionGate";
import { AccountCard, AccountCardSkeleton } from "./sections/AccountCard";
import { StatsGrid, StatsGridSkeleton } from "./sections/StatsGrid";
import { ProfileCompletenessCard, ProfileCompletenessSkeleton } from "./sections/ProfileCompleteness";
import { RecentMatchingRequests, RecentMatchingRequestsSkeleton } from "./sections/RecentMatchingRequests";
import { RecentReviewsCard, RecentReviewsSkeleton } from "./sections/RecentReviews";
import { FollowUpsCard, FollowUpsSkeleton } from "./sections/FollowUpsCard";
import { QuickLinksGrid } from "./sections/QuickLinksGrid";  // sync — see note below

export default function ProviderDashboardPage() {
  return (
    // NOTE: per C1 the real structure is: static <header> OUTSIDE the gate +
    // <Suspense fallback={null}> wrapping <SessionGate requireRole="PROVIDER">.
    // The sketch below shows the section boundaries; build the shell from C1.
    <SessionGate>{(userId) => (
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        {/* Page header — STATIC: hoist OUTSIDE the gate per C1 (do not leave
            it here, where it would wait on the session read) */}
        <header>
          <h1>Valdymo panelė</h1>
        </header>

        {/* 1. Account card — fast, single Prisma read; shared across 3 sections */}
        <Suspense fallback={<AccountCardSkeleton />}>
          <AccountCard userId={userId} />
        </Suspense>

        {/* 2. Stats grid — parallel counts */}
        <Suspense fallback={<StatsGridSkeleton />}>
          <StatsGrid userId={userId} />
        </Suspense>

        {/* 3. Profile completeness — own boundary, ~150ms */}
        <Suspense fallback={<ProfileCompletenessSkeleton />}>
          <ProfileCompletenessCard userId={userId} />
        </Suspense>

        {/* 4. Recent matching requests — slowest, can stream last */}
        <Suspense fallback={<RecentMatchingRequestsSkeleton />}>
          <RecentMatchingRequests userId={userId} />
        </Suspense>

        {/* 5. Quick-links grid — STATIC (link hrefs only), no fetch */}
        <QuickLinksGrid />

        {/* 6. Recent reviews — small list, independent */}
        <Suspense fallback={<RecentReviewsSkeleton />}>
          <RecentReviewsCard userId={userId} />
        </Suspense>

        {/* 7. AI follow-ups — slowest (LLM), streams in last */}
        <Suspense fallback={<FollowUpsSkeleton />}>
          <FollowUpsCard userId={userId} />
        </Suspense>
      </div>
    )}</SessionGate>
  );
}
```

**Notes on the boundaries above:**

- `AccountCard` bundles the email-verification banner, suspension alert, and
  pending-claim alert — all read the same single Prisma row, so one boundary
  avoids fanning out redundant queries.
- Next-action CTA derives from `AccountCard` + `StatsGrid`; compute it inside
  `AccountCard` rather than blocking on both.
- `QuickLinksGrid` is sync (static link hrefs). Story modal: avatar button
  renders sync in `AccountCard`; the modal fetches lazily on click — no
  boundary needed (interaction-driven, not page-load).

### D. Skeleton mapping

| Boundary               | Fallback component          | Shape spec                                                                                          |
|------------------------|-----------------------------|-----------------------------------------------------------------------------------------------------|
| `AccountCard`          | `AccountCardSkeleton`       | Reuse [DashboardSkeleton lines 22-30](src/app/tiekejas/page.tsx:22) — 11x11 avatar circle + 2 lines + 24w pill |
| `StatsGrid`            | `StatsGridSkeleton`         | Reuse [DashboardSkeleton lines 33-47](src/app/tiekejas/page.tsx:33) — 4 stat tiles, 11x11 icon square + 2 lines each |
| `ProfileCompletenessCard` | `ProfileCompletenessSkeleton` | NEW — `h-2 w-full rounded-full` progress bar + 3 lines of "missing item" rows (`h-3 w-3/4`) |
| `RecentMatchingRequests`  | `RecentMatchingRequestsSkeleton` | NEW — 3 lead-card skeletons (mirror the request-list-loading shape at [src/app/tiekejas/uzklausos/loading.tsx:23-42](src/app/tiekejas/uzklausos/loading.tsx:23)) |
| `RecentReviewsCard`    | `RecentReviewsSkeleton`     | NEW — 3 review-row skeletons: avatar circle + rating stars (`h-3 w-24`) + 2 text lines             |
| `FollowUpsCard`        | `FollowUpsSkeleton`         | NEW — list header + 3 follow-up rows: icon + name + last-message snippet                            |

### E. Refactor scope

This is the heaviest refactor in the plan. Estimate: **6-8 hours**.

1. **Split ProviderDashboardClient.tsx (878 lines) into ~6 server section
   components** under `src/app/tiekejas/sections/`. Each section is an
   async server component that takes `userId` (and sometimes
   `providerProfileId`) as props and does its own Prisma read.
2. **Move all client interactivity into leaf islands.** The story modal,
   the "complete profile" CTA hover state, the AI-follow-ups dismiss
   button — each becomes a tiny `"use client"` leaf inside its parent
   server component.
3. **Build `<SessionGate>`** (new file `src/app/tiekejas/SessionGate.tsx`)
   that wraps a `getServerSession()` call + role check + redirect in a
   render-prop pattern: `<SessionGate>{userId => <children />}</SessionGate>`.
   This MUST live above the per-section Suspenses so the gate fires before
   any skeleton paints. Reuse pattern from
   [src/app/paskyra/zinutes/page.tsx:26-35](src/app/paskyra/zinutes/page.tsx:26).
4. **Delete `/api/tiekejas/stats` endpoint** (or keep it for the legacy
   client component if other surfaces use it — grep first). After the
   refactor, no part of the dashboard fetches from this endpoint;
   everything goes through server components.
5. **Delete the existing `DashboardSkeleton`** function (lines 14-63) —
   per-section skeletons replace it.

**Lines changed:** ~900 lines deleted from `ProviderDashboardClient.tsx`,
~600 lines added across 6 new section files + SessionGate. Net ~-300.

### F. Risks

- **Session re-validation cost**: each server section calls
  `getServerSession()` independently (JWT decode + DB read). Mitigation:
  pass `userId` down from `SessionGate` so sections take a `providerId`
  arg without re-decoding.
- **API consumers**: grep for external/mobile clients of
  `/api/tiekejas/stats` before deleting; keep it as a thin wrapper if any.
- **`ProviderFollowUpsCard.tsx`** stays a `"use client"` leaf inside the
  new server `FollowUpsCard` wrapper, but the wrapper server-fetches the
  data so the LLM call happens during the stream, not after hydration.
- **`expandToMatchSet()` is expensive** (walks the taxonomy) and is shared
  by StatsGrid + RecentMatchingRequests. Compute once at the gate level
  and pass down — otherwise both boundaries pay the cost.
- Don't touch [Header.tsx](src/components/layout/Header.tsx) — its
  client-side session read is fine as-is.

---

## Page 2: `/tiekejas/uzklausos` (provider request list)

**Current state**: [src/app/tiekejas/uzklausos/page.tsx](src/app/tiekejas/uzklausos/page.tsx:1-12)
is a thin server shell with one `<Suspense fallback={<RequestsListSkeleton />}>`
wrapping [RequestsListClient.tsx](src/app/tiekejas/uzklausos/RequestsListClient.tsx)
(558 lines, `"use client"`). Pattern A. The client fetches
`/api/tiekejas/uzklausos?page=X&category=&location=&search=&sort=` in
`useEffect` and re-fetches on filter changes.

**Important constraint**: the filter UX is interactive (category, location,
sort, search). Filter changes can't go through full server round-trips
without feeling sluggish, so the **interactive filter shell must stay
client-side**. The Suspense boundary opportunity is the
**initial-load list** + the **filter dropdown source data** (categories).

### A. Section inventory

1. **Page header** — title "Užklausos" + subtitle
2. **Tab toggle** — "Klientų užklausos" / "Mano pateiktos" (only for
   PROVIDER role users who also have submitted their own requests)
3. **Credit-balance badge** — top-right corner (small pill showing
   `creditBalance`)
4. **Sort dropdown** — Relevance / Newest (client-only UI state)
5. **Search input + filter trigger** — client-only UI
6. **Filter panel (mobile sheet / desktop popover)**
   - Category picker (uses `getServiceCategoryGroups()` which is already
     `'use cache'`)
   - Location picker (uses static `LITHUANIAN_CITIES` constant)
   - Clear button
7. **Active filter chips** — derived from URL search params, client-only
8. **Request cards list** — the main payload, paginated 20 per page
9. **Empty state** — "no results" / "no filters match"
10. **Pagination** — page numbers

### B. Data dependency per section

| # | Section            | Source                                                            | Session-dep | Cached?  | Cost                             |
|---|--------------------|-------------------------------------------------------------------|-------------|----------|----------------------------------|
| 1 | Header             | STATIC                                                            | no          | n/a      | <1ms                             |
| 2 | Tab toggle         | session.user.role                                                 | yes         | shared   | <1ms                             |
| 3 | Credit-balance     | `prisma.providerProfile.findUnique({ select: { creditBalance } })`| yes         | no       | ~30ms                            |
| 4 | Sort dropdown      | URL query param                                                   | no          | n/a      | <1ms                             |
| 5 | Search + trigger   | URL query param                                                   | no          | n/a      | <1ms                             |
| 6 | Filter panel data  | `getServiceCategoryGroups()` from [src/lib/service-categories.ts:87](src/lib/service-categories.ts) | no | **CACHED** (`'use cache'`, ~50-150ms cold, ~1ms warm) | n/a |
| 7 | Active chips       | derived from URL                                                  | no          | n/a      | <1ms                             |
| 8 | Request cards list | `prisma.serviceRequest.findMany()` + semantic match scoring in Node + `getUnlockedRequestIds()` (raw SQL) | yes | no | **500-1000ms** (the slowest single query in the whole platform) |
| 9 | Empty state        | derived from §8                                                   | yes         | shared   | <1ms                             |
| 10 | Pagination         | derived from §8                                                   | yes         | shared   | <1ms                             |

### C. Proposed Suspense layout

```tsx
// src/app/tiekejas/uzklausos/page.tsx
import { Suspense } from "react";
import { SessionGate } from "../SessionGate";
import { CreditBadge, CreditBadgeSkeleton } from "./sections/CreditBadge";
import { RequestsFilterShell } from "./RequestsFilterShell";  // "use client"
import { RequestsList, RequestsListSkeleton } from "./sections/RequestsList";

interface PageProps {
  searchParams: Promise<{ page?: string; category?: string; location?: string; search?: string; sort?: string }>;
}

export default function ProviderRequestsPage({ searchParams }: PageProps) {
  return (
    <SessionGate>{(userId) => (
      <div className="mx-auto max-w-6xl px-4 py-6">
        <header className="mb-5 flex items-center justify-between gap-3">
          <h1>Užklausos</h1>
          <Suspense fallback={<CreditBadgeSkeleton />}>
            <CreditBadge userId={userId} />
          </Suspense>
        </header>

        {/* Filter shell stays client — it owns search/sort/filter state */}
        <RequestsFilterShell />

        {/* List streams on its own boundary. C2: NO key — pass the
            searchParams Promise down and await it inside RequestsList.
            On filter-change navigation Next re-streams in a transition. */}
        <Suspense fallback={<RequestsListSkeleton />}>
          <RequestsList userId={userId} searchParams={searchParams} />
        </Suspense>
      </div>
    )}</SessionGate>
  );
}
```

**Streaming on filter change (per C2, no `key`)**: the page stays a static
shell; `RequestsList` awaits the `searchParams` Promise internally. When a
filter `<Link>` changes the URL, Next re-renders the section inside a
transition — the previous list stays visible until the new data resolves, so
there is no full-page blank and no skeleton flash on every keystroke. (A
`key={await-resolved-value}` would force a skeleton remount, but it can't be
computed in a static page and conflicts with the shell — see C2.)

### D. Skeleton mapping

| Boundary       | Fallback                  | Shape                                                                                                       |
|----------------|---------------------------|-------------------------------------------------------------------------------------------------------------|
| `CreditBadge`  | `CreditBadgeSkeleton`     | NEW — small `<Skeleton className="h-8 w-32 rounded-lg" />`                                                  |
| `RequestsList` | `RequestsListSkeleton`    | Reuse the inline `RequestsListSkeleton` from [src/app/tiekejas/uzklausos/page.tsx:14-62](src/app/tiekejas/uzklausos/page.tsx:14), promoted to a shared component file |

### E. Refactor scope

Estimate: **3-4 hours**.

1. Split `RequestsListClient.tsx` into: `RequestsFilterShell.tsx`
   (`"use client"`, ~300 lines, owns search/sort/filter state → URL),
   `sections/RequestsList.tsx` (async server, ~200 lines, reads
   `searchParams` + `userId`, does the query + scoring), `sections/
   CreditBadge.tsx` (~20 lines), `RequestCard.tsx` (server, ~80 lines).
2. List reads filters from `searchParams` (server prop), not
   `useSearchParams()`. The filter shell pushes URL changes to re-render it.
3. Delete the redundant inner `<Suspense>` at
   [RequestsListClient.tsx:49-52](src/app/tiekejas/uzklausos/RequestsListClient.tsx).
   Pagination → `<Link>` with `?page=X`, no client work.

**Lines changed:** ~600 deleted, ~700 added (the split is verbose; small
files). Net ~+100.

### F. Risks

- **Filter-change UX is the main risk.** Today filter changes are
  client-side `fetch()` with no page transition (local-first, per
  [AGENTS.md:90](AGENTS.md:90)). The server version adds a ~200-400ms URL
  round-trip with a skeleton flash. **Recommended**: ship the server
  version first (still ~500ms, skeleton matches layout so no jump), measure,
  then layer optimistic in-memory filtering on top only if users complain.
  Don't pre-build the optimistic path.
- **Semantic scoring** stays unchanged — just moves from API route to the
  server component (still Node-side after the Prisma read).
- **`getUnlockedRequestIds()`** (raw SQL) stays in the list boundary,
  parallel within `Promise.all`.

---

## Page 3: `/tiekejas/uzklausos/[id]` (request detail)

**Current state**: [src/app/tiekejas/uzklausos/[id]/page.tsx](src/app/tiekejas/uzklausos/[id]/page.tsx:1-12)
is Pattern A — thin server shell + one Suspense wrapping
[RequestDetailClient.tsx](src/app/tiekejas/uzklausos/[id]/RequestDetailClient.tsx)
(443 lines, `"use client"`). The client fetches
`/api/tiekejas/uzklausos/[id]` in `useEffect`. This page has a strong
sequential UX (header → description → response form → messages), so the
boundaries need to map onto the visual reading order.

### A. Section inventory

1. **Back button** — STATIC link
2. **Request metadata header** — category badges, status badge, title,
   location/date/budget/deadline pills
3. **Request description card** — full text + attachment photos
   (`RequestPhotos` component) + client info (name, contact links if
   unlocked)
4. **Eligibility warning banner** (conditional — "missing specialization")
5. **Accepted-response success banner** (conditional — green box if
   accepted)
6. **Already-responded notice** (conditional — small green pill if
   responded but not accepted)
7. **Request-closed notice** (conditional — if `status !== "OPEN"`)
8. **LeadCopilotCard** (conditional — hidden if already responded or
   ineligible) — has a "Generate insight" button that triggers a POST
   call to `/api/.../copilot` with LLM
9. **UnlockCard** (conditional — hidden if already unlocked) — has an
   "Unlock for 1 credit" button that POSTs to `/api/.../unlock`
10. **Response form** (conditional — hidden if already responded or
    request is closed) — textarea + price input + AI-generate button +
    submit
11. **"My answer" heading + provider's response card(s)** — usually 1, may
    be >1
12. **Thread chat per response** — uses ThreadChat component, optimistic
    messaging (already has its own internal Suspense for realtime
    subscription in some cases)

### B. Data dependency per section

| #  | Section                | Source                                                                  | Session-dep | Cached? | Cost                          |
|----|------------------------|-------------------------------------------------------------------------|-------------|---------|-------------------------------|
| 1  | Back button            | STATIC                                                                  | no          | n/a     | <1ms                          |
| 2  | Metadata header        | `prisma.serviceRequest.findUnique({ id })` + categories                 | yes (gate)  | no      | ~100-200ms                    |
| 3  | Description + client   | from §2 + `isLeadUnlocked()` raw SQL                                    | yes         | no      | included + ~30ms              |
| 4  | Eligibility warning    | `checkEligibility(providerId, request.categoryId)`                      | yes         | no      | ~50ms                         |
| 5  | Accepted banner        | derived from §2 + provider's own response                               | yes         | shared  | included                      |
| 6  | Already-responded      | derived from §11                                                        | yes         | shared  | included                      |
| 7  | Closed notice          | derived from §2.status                                                  | yes         | shared  | included                      |
| 8  | LeadCopilotCard        | STATIC button; on-click → LLM (1500-3000ms)                             | yes         | no      | <1ms (lazy)                   |
| 9  | UnlockCard             | STATIC button; on-click → POST                                          | yes         | no      | <1ms                          |
| 10 | Response form          | STATIC inputs; on-submit/AI-generate triggers LLM                       | yes         | no      | <1ms                          |
| 11 | My response card(s)    | `prisma.response.findMany({ requestId, providerId })`                   | yes         | no      | ~80-150ms                     |
| 12 | Thread chat            | included in §11 (messages array)                                        | yes         | shared  | included                      |

### C. Proposed Suspense layout

```tsx
// src/app/tiekejas/uzklausos/[id]/page.tsx
import { Suspense } from "react";
import { SessionGate } from "../../SessionGate";
import { RequestHeader, RequestHeaderSkeleton } from "./sections/RequestHeader";
import { RequestBody, RequestBodySkeleton } from "./sections/RequestBody";
import { ResponseSection, ResponseSectionSkeleton } from "./sections/ResponseSection";
import { LeadCopilotCard } from "./LeadCopilotCard";  // existing client island
import { UnlockCard } from "./UnlockCard";            // existing client island

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProviderRequestDetailPage({ params }: PageProps) {
  return (
    <SessionGate>{(userId) => (
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Static back link — paints with shell */}
        <BackLink />

        {/* Header — quick read, paints fast */}
        <Suspense fallback={<RequestHeaderSkeleton />}>
          <RequestHeader requestId={params} userId={userId} />
        </Suspense>

        {/* Body (description + client info + unlock state) — depends on
            same underlying request row as header, so co-located */}
        <Suspense fallback={<RequestBodySkeleton />}>
          <RequestBody requestId={params} userId={userId} />
        </Suspense>

        {/* Response section: form, copilot, unlock, existing response,
            thread chat — depends on eligibility + provider's own response */}
        <Suspense fallback={<ResponseSectionSkeleton />}>
          <ResponseSection requestId={params} userId={userId} />
        </Suspense>
      </div>
    )}</SessionGate>
  );
}
```

**Tradeoffs**: all three boundaries read the same
`prisma.serviceRequest.findUnique({ id })` row. This is intentional
duplication for streaming — each boundary fetches independently and the
connection pool handles parallel reads cheaply (<5ms per dupe). A single
shared fetch at the gate level would block the whole page. If profiling
later shows the dupes are expensive, hoist the fetch into a `<RequestGate>`
and pass via props — but ship the streaming version first.

### D. Skeleton mapping

| Boundary           | Fallback                   | Shape                                                                                                       |
|--------------------|----------------------------|-------------------------------------------------------------------------------------------------------------|
| `RequestHeader`    | `RequestHeaderSkeleton`    | Reuse [src/app/tiekejas/uzklausos/[id]/page.tsx:19-30](src/app/tiekejas/uzklausos/[id]/page.tsx:19) — category badges + title + meta pills |
| `RequestBody`      | `RequestBodySkeleton`      | Reuse [src/app/tiekejas/uzklausos/[id]/page.tsx:32-44](src/app/tiekejas/uzklausos/[id]/page.tsx:32) — paragraph + divider + metadata footer |
| `ResponseSection`  | `ResponseSectionSkeleton`  | Reuse [src/app/tiekejas/uzklausos/[id]/page.tsx:46-66](src/app/tiekejas/uzklausos/[id]/page.tsx:46) — form card + heading + response cards |

The current `RequestDetailSkeleton` is deleted; its three rows become the
three component-level skeletons above.

### E. Refactor scope

Estimate: **3-4 hours**.

1. Split `RequestDetailClient.tsx` (443 lines) into 3 async server sections;
   keep `LeadCopilotCard.tsx`, `UnlockCard.tsx`, and the in-form AI/submit
   logic as `"use client"` islands inside their parent sections.
2. Response form + thread chat stay client but receive server-fetched
   initial data (existing response, eligibility) as props, so they hydrate
   with content visible.

**Lines changed:** ~450 deleted, ~550 added across 3 server sections. Net
~+100.

### F. Risks

- **Thread chat realtime**: the chat is server-fetched on load but may
  update live. Keep it a client island that hydrates with server-fetched
  initial messages, then subscribes to realtime — Suspense doesn't govern
  this.
- **`isLeadUnlocked()`** (raw SQL) stays inline in `RequestBody`.
- **View tracking + read-status updates** (fire-and-forget in API route
  lines 82-99) move into the section that owns the reads, same pattern.

---

## Page 4: `/tiekejas/zinutes` (provider inbox)

**Current state**: [src/app/tiekejas/zinutes/page.tsx](src/app/tiekejas/zinutes/page.tsx:1)
is `"use client"` end-to-end. Pattern C. **Server Suspense does nothing
here until the page is converted to Pattern A or B first.**

### A. Section inventory

1. **Breadcrumb** — STATIC "← Valdymo panelė" link
2. **Page header** — title "Žinutės" + unread-count badge
3. **Filter tabs** — All / Unread / Archived (with dynamic count badges)
4. **Conversation list** — vertically stacked cards: each shows unread
   dot, type badge (Request/Direct), title, snippet, timestamp, chevron
5. **Empty state** — if no conversations match the filter

### B. Data dependency per section

| # | Section            | Source                                                                                | Session-dep | Cached? | Cost                                |
|---|--------------------|---------------------------------------------------------------------------------------|-------------|---------|-------------------------------------|
| 1 | Breadcrumb         | STATIC                                                                                | no          | n/a     | <1ms                                |
| 2 | Page header        | derived from §4 (unread count)                                                        | yes         | shared  | <1ms                                |
| 3 | Filter tabs        | derived from §4                                                                       | yes         | shared  | <1ms                                |
| 4 | Conversation list  | `prisma.response.findMany() + prisma.directInquiry.findMany()` (parallel, merged)     | yes         | no      | **300-600ms** (the only real fetch) |
| 5 | Empty state        | derived from §4                                                                       | yes         | shared  | <1ms                                |

### C. Proposed Suspense layout

**One fetch** (the conversation list) — nothing to parallelize. The win is
the Pattern C → B conversion, letting the shell paint while the list
streams:

```tsx
// src/app/tiekejas/zinutes/page.tsx
import { Suspense } from "react";
import { SessionGate } from "../SessionGate";
import { ConversationList, ConversationListSkeleton } from "./ConversationList";
import { InboxFilterShell } from "./InboxFilterShell";  // "use client"

export default function ProviderInboxPage() {
  return (
    <SessionGate>{(userId) => (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BackLink href="/tiekejas">Valdymo panelė</BackLink>
        <header>
          <h1>Žinutės</h1>
        </header>

        {/* Filter shell stays client */}
        <InboxFilterShell />

        {/* Single boundary — only one fetch */}
        <Suspense fallback={<ConversationListSkeleton />}>
          <ConversationList userId={userId} />
        </Suspense>
      </div>
    )}</SessionGate>
  );
}
```

The filter shell reads URL search params (`?tab=unread`). Unread-count
badges derive from the list once it arrives — show "—" or label-only until
then.

### D. Skeleton mapping

| Boundary             | Fallback                       | Shape                                                                                              |
|----------------------|--------------------------------|----------------------------------------------------------------------------------------------------|
| `ConversationList`   | `ConversationListSkeleton`     | NEW — 5 conversation rows: `h-3 w-3 rounded-full` dot + `h-4 w-32` title + `h-3 w-48` snippet + `h-3 w-14` timestamp |

### E. Refactor scope

Estimate: **2 hours**.

1. Convert `page.tsx` from `"use client"` to a server component.
2. Extract the filter UI (tab buttons + state) into
   `InboxFilterShell.tsx` (`"use client"`).
3. Extract the list rendering into `ConversationList.tsx` (server async),
   which does the Prisma reads server-side and renders the cards.
4. Move `/api/tiekejas/zinutes` route logic into the server component (or
   keep the API route for mobile clients — grep first).
5. Build the new `ConversationListSkeleton`.

**Lines changed:** ~200 deleted from `page.tsx`, ~250 added across
`page.tsx` (thin) + `InboxFilterShell` + `ConversationList`. Net ~+50.

### F. Risks

- **No realtime today** (confirmed) — out of scope.
- **Unread count**: if a provider has 1000+ conversations and the count
  blocks header paint, split a fast `<UnreadBadge />` (just a `count()`,
  ~30ms) into its own Suspense. Otherwise the single-boundary version is
  fine — don't pre-build it.

---

## Page 5: `/tiekejas/zinutes/[id]` (message thread)

**Current state**: [src/app/tiekejas/zinutes/[id]/page.tsx](src/app/tiekejas/zinutes/[id]/page.tsx)
is Pattern A — thin server + one Suspense around
[IdClient.tsx](src/app/tiekejas/zinutes/[id]/IdClient.tsx) (275 lines,
`"use client"`). The client fetches `/api/tiekejas/zinutes/[id]` in
`useEffect`.

### A. Section inventory

1. **Back button** — STATIC
2. **Thread header** — badges (Direct, archived), sender name, created
   timestamp
3. **Archive/Restore button** — small action button next to header
4. **Contact info card** — name, email, phone, budget metadata (only if
   present on the inquiry)
5. **Chat thread** — scrollable message list, each with avatar + presence +
   message body
6. **Message input + send button** — bottom of page, sticky

### B. Data dependency per section

| # | Section            | Source                                                              | Session-dep | Cached? | Cost                          |
|---|--------------------|---------------------------------------------------------------------|-------------|---------|-------------------------------|
| 1 | Back button        | STATIC                                                              | no          | n/a     | <1ms                          |
| 2 | Thread header      | `prisma.directInquiry.findFirst({ id, providerId })`                | yes         | no      | ~50-100ms (shared with §3-5) |
| 3 | Archive button     | from §2                                                             | yes         | shared  | <1ms                          |
| 4 | Contact info card  | from §2                                                             | yes         | shared  | <1ms                          |
| 5 | Chat thread        | `prisma.directInquiry.findFirst({ include: { messages } })` (single query, ASC ordered) | yes | no | included (~50ms extra)        |
| 6 | Input + send       | STATIC inputs; on-submit POSTs                                      | yes         | no      | <1ms                          |

### C. Proposed Suspense layout

The page is **one fetch** (inquiry + messages from the same row + join).
Multiple boundaries would just fan out the same query — **single boundary
is correct.** Convert Pattern A → B:

```tsx
// src/app/tiekejas/zinutes/[id]/page.tsx
import { Suspense } from "react";
import { SessionGate } from "../../SessionGate";
import { ThreadView, ThreadViewSkeleton } from "./ThreadView";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function ProviderInquiryDetailPage({ params }: PageProps) {
  return (
    <SessionGate>{(userId) => (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BackLink href="/tiekejas/zinutes">Žinutės</BackLink>
        <Suspense fallback={<ThreadViewSkeleton />}>
          <ThreadView inquiryId={params} userId={userId} />
        </Suspense>
      </div>
    )}</SessionGate>
  );
}
```

### D. Skeleton mapping

| Boundary       | Fallback              | Shape                                                                                                |
|----------------|-----------------------|------------------------------------------------------------------------------------------------------|
| `ThreadView`   | `ThreadViewSkeleton`  | NEW — header pill row (`h-6 w-24 rounded-full` + `h-4 w-32`) + contact card (3 `h-3` lines) + 4 message rows (`h-10 w-10 rounded-full` avatar + 2 text lines) + sticky input bar (`h-12 w-full rounded-xl`) |

### E. Refactor scope

Estimate: **1.5 hours**.

1. Page.tsx becomes server-only.
2. Extract `ThreadView.tsx` (async server, fetches inquiry + messages). The
   message input is a `"use client"` leaf inside it.
3. Message-send (POST `/api/.../messages`) stays as today — interactive
   mutation, not a data load.

**Lines changed:** ~280 deleted, ~300 added. Net ~+20.

### F. Risks

- **No realtime today** for incoming messages — out of scope; when added,
  it goes in the client input-island as a Supabase channel subscription.
- **`providerLastReadAt` update** (API route lines 92-99) moves into
  `ThreadView` as fire-and-forget after the read.

---

## Page 6: `/tiekejas/profilis` (provider profile editor) — **SKIP for Suspense, FIX architecture**

**Current state**: [src/app/tiekejas/profilis/page.tsx](src/app/tiekejas/profilis/page.tsx:1-5)
is `"use client"` end-to-end, 918 lines. Pattern C. Three parallel client
fetches on mount: `/api/tiekejas/profilis`, `/api/provider/stories`,
`/api/service-categories` (last is cached). On top of that, there's a
debounced auto-suggest fetch every keystroke.

### Verdict: `SKIP` adding granular Suspense — fix the architecture instead.

The page is one large editable form where every section shares state
(visibility toggle reads `account.slug`, save + completeness bar read all
form fields). Splitting into independent boundaries would just duplicate
state subscriptions. The slow path isn't initial load anyway — it's the
debounced auto-suggest and the save round-trip, neither helped by Suspense.
Refactoring 918 lines of interconnected form state is ~12+ hours and higher
risk than the rest of the plan combined.

**What SHOULD happen (separate workstream, track in `NOTES.md`):** convert
`page.tsx` to Pattern B — thin server shell with `SessionGate` +
`Promise.all([profile, categories, stories])` → render `<ProfileEditor
initialProfile={...} .../>` as one `"use client"` island wrapped in a single
`<Suspense fallback={<ProfileEditorSkeleton />}>`. The form then hydrates
with content instead of empty fields. The editor stays monolithic by
design. **Don't bundle into the Suspense PRs.**

---

## Page 7: `/tiekejas/atsakymai` (provider's responses list)

**Current state**: [src/app/tiekejas/atsakymai/page.tsx](src/app/tiekejas/atsakymai/page.tsx)
is Pattern A — thin server + one Suspense (with `LoadingSpinner` fallback)
wrapping [AtsakymaiClient.tsx](src/app/tiekejas/atsakymai/AtsakymaiClient.tsx)
(251 lines). Client fetches `/api/tiekejas/atsakymai` in `useEffect`.

### A. Section inventory

1. **Page header** — title "Mano atsakymai" + subtitle
2. **Status tabs** — All / Awaiting / Accepted / Rejected (with count
   badges)
3. **Response list** — each row: category badge + status badge + request
   title + meta (location, date, budget) + "View" chevron
4. **Empty state** — "no responses" / "no responses in this tab"

### B. Data dependency per section

| # | Section            | Source                                                                  | Session-dep | Cached? | Cost                  |
|---|--------------------|-------------------------------------------------------------------------|-------------|---------|-----------------------|
| 1 | Header             | STATIC                                                                  | no          | n/a     | <1ms                  |
| 2 | Status tabs        | derived from §3 (counts)                                                | yes         | shared  | <1ms                  |
| 3 | Response list      | `prisma.response.findMany({ providerId, include: { request, request.categoryRef } })` | yes | no | ~150-250ms        |
| 4 | Empty state        | derived from §3                                                         | yes         | shared  | <1ms                  |

### C. Proposed Suspense layout

Same as `/tiekejas/zinutes` — **single fetch, single boundary**, Pattern
A → B. Tabs become URL-driven `<Link>`s:

```tsx
// src/app/tiekejas/atsakymai/page.tsx
import { Suspense } from "react";
import { SessionGate } from "../SessionGate";
import { ResponsesList, ResponsesListSkeleton } from "./ResponsesList";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default function ProviderResponsesPage({ searchParams }: PageProps) {
  return (
    <SessionGate>{(userId) => (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header>
          <h1>Mano atsakymai</h1>
        </header>
        {/* C2: no key — await searchParams inside ResponsesList */}
        <Suspense fallback={<ResponsesListSkeleton />}>
          <ResponsesList userId={userId} searchParams={searchParams} />
        </Suspense>
      </div>
    )}</SessionGate>
  );
}
```

`ResponsesList` (server async) fetches all responses once and renders tabs
+ filtered list together. Tabs are `<Link href="?status=...">` — URL-driven,
no client JS.

### D. Skeleton mapping

| Boundary           | Fallback                  | Shape                                                                                                  |
|--------------------|---------------------------|--------------------------------------------------------------------------------------------------------|
| `ResponsesList`    | `ResponsesListSkeleton`   | NEW — 4 tab pills (`h-9 w-24 rounded-lg`) + 5 response rows (badge + 4-line content) |

### E. Refactor scope

Estimate: **1.5 hours**.

1. Convert `page.tsx` to server with `SessionGate`.
2. Extract `ResponsesList.tsx` as async server component.
3. Optional: turn the tabs into `<Link href="?status=accepted">` so
   filtering becomes URL-driven (no client JS for the tabs).
4. Build `ResponsesListSkeleton`.

**Lines changed:** ~250 deleted, ~280 added. Net ~+30.

### F. Risks

- **None significant.** Smallest page in the cluster.

---

## Page 8: `/paskyra/profilis` (user profile editor) — **already on the right pattern**

**Current state**: [src/app/paskyra/profilis/page.tsx](src/app/paskyra/profilis/page.tsx:19-49)
is Pattern B — `<Suspense fallback={<ProfileFormSkeleton />}>` wraps an
async `<ProfileFormLoader />` that does `getServerSession()` + Prisma read
+ renders `<ProfileForm initialProfile={user} />` (a 303-line `"use client"`
form).

### A. Section inventory

1. **Header strip** — "Paskyra" breadcrumb + "Mano profilis" title + button
2. **Main form card "Kontaktai"** — Name input + Email editor + Phone
   verification + save button
3. **Security section** (inside the same card) — password-reset desc + button
4. **Sidebar card "Profilio pilnumas"** — progress bar + 3 status rows +
   request count

### B. Data dependency per section

| # | Section            | Source                                                                    | Session-dep | Cached? | Cost                          |
|---|--------------------|---------------------------------------------------------------------------|-------------|---------|-------------------------------|
| 1 | Header             | STATIC                                                                    | no          | n/a     | <1ms                          |
| 2 | Form card          | `prisma.user.findUnique({ id, name, email, phone, emailVerified, phoneVerifiedAt, _count.serviceRequests })` (single query at [page.tsx:32-44](src/app/paskyra/profilis/page.tsx:32)) | yes | no | ~50-80ms |
| 3 | Security section   | derived from §2.email                                                     | yes         | shared  | <1ms                          |
| 4 | Sidebar            | derived from §2 (name, email, phone, _count.serviceRequests)              | yes         | shared  | <1ms                          |

### C. Proposed Suspense layout

**Minimal change.** The single-boundary layout is already correct — all
sections read the same Prisma row, so splitting would just fan out the
query. The ONE improvement: hoist the static header above the Suspense so
the title + "back" button paint with the shell instead of being absent
during load (today's skeleton at lines 51-76 omits the header):

```tsx
// src/app/paskyra/profilis/page.tsx (PROPOSED)
export default function ClientProfilePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <ProfileHeader />  {/* static — paints with shell */}
      <Suspense fallback={<ProfileFormSkeleton />}>
        <ProfileFormLoader />
      </Suspense>
    </div>
  );
}
```

### D. Skeleton mapping

| Boundary             | Fallback                | Shape                                                                                |
|----------------------|-------------------------|--------------------------------------------------------------------------------------|
| `ProfileFormLoader`  | `ProfileFormSkeleton`   | Existing inline skeleton at [page.tsx:51-76](src/app/paskyra/profilis/page.tsx:51) — keep as-is, just remove the header part since it now renders above |

### E. Refactor scope

Estimate: **30 minutes**.

1. Extract the static header into `<ProfileHeader />` (sync component).
2. Slim down the skeleton (drop the heading lines, since the header now
   paints before the skeleton).
3. Move the header out of the Suspense boundary.

**Lines changed:** ~20 added, ~5 deleted.

### F. Risks

- **Almost none**, this is a polish improvement on a healthy page.

---

## Page 9: `/paskyra/uzklausos` (user's own requests)

**Current state**: [src/app/paskyra/uzklausos/page.tsx](src/app/paskyra/uzklausos/page.tsx:1)
is `"use client"` end-to-end. Pattern C. Client fetches
`/api/paskyra/uzklausos` in `useEffect`, shows `<LoadingSpinner />` while
loading, no Suspense at all.

### A. Section inventory

1. **Page header** — title ("Mano užklausos" or "Mano pateiktos užklausos"
   for PROVIDER role) + "Nauja" button
2. **Provider role toggle** (conditional, only for PROVIDER role) — two
   tabs: "Klientų" / "Mano pateiktos"
3. **Filter tabs** (only if requests exist) — Visos / Aktyvios / Laukia /
   Vykdomos / Uždarytos with count badges
4. **Request list** — each row: title + status badge + meta + response
   count + next-action hint + chevron
5. **Empty state** — if `requests.length === 0`

### B. Data dependency per section

| # | Section                | Source                                                                  | Session-dep | Cached? | Cost                  |
|---|------------------------|-------------------------------------------------------------------------|-------------|---------|-----------------------|
| 1 | Header                 | `session.user.role` (for title variant)                                 | yes         | shared  | <1ms                  |
| 2 | Provider toggle        | `session.user.role`                                                     | yes         | shared  | <1ms                  |
| 3 | Filter tabs            | derived from §4                                                         | yes         | shared  | <1ms                  |
| 4 | Request list           | `prisma.serviceRequest.findMany({ clientId: userId, include: { categoryRef, _count.responses, responses: take 1 ... } })` | yes | no | ~200-400ms |
| 5 | Empty state            | derived from §4                                                         | yes         | shared  | <1ms                  |

### C. Proposed Suspense layout

Same answer as `/tiekejas/zinutes` and `/tiekejas/atsakymai` — **single
fetch, convert Pattern C → Pattern B, single Suspense**:

```tsx
// src/app/paskyra/uzklausos/page.tsx
import { Suspense } from "react";
import { SessionGate } from "../SessionGate";  // a UserSessionGate variant — see §Cross-cutting
import { MyRequestsList, MyRequestsListSkeleton } from "./MyRequestsList";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default function MyRequestsPage({ searchParams }: PageProps) {
  return (
    <UserSessionGate>{(session) => (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <header className="flex items-center justify-between mb-6">
          <h1>{session.user.role === "PROVIDER" ? "Mano pateiktos užklausos" : "Mano užklausos"}</h1>
          <Link href="/uzklausos/nauja"><Button size="sm">Nauja</Button></Link>
        </header>

        {session.user.role === "PROVIDER" && <ProviderRoleToggle />}

        {/* C2: no key — await searchParams inside MyRequestsList */}
        <Suspense fallback={<MyRequestsListSkeleton />}>
          <MyRequestsList userId={session.user.id} searchParams={searchParams} />
        </Suspense>
      </div>
    )}</UserSessionGate>
  );
}
```

The filter tabs become `<Link>` elements that update `?status=` — no
client JS needed.

### D. Skeleton mapping

| Boundary         | Fallback                  | Shape                                                                                              |
|------------------|---------------------------|----------------------------------------------------------------------------------------------------|
| `MyRequestsList` | `MyRequestsListSkeleton`  | NEW — 5 tab pills (`h-9 w-20 rounded-lg`) + 5 request cards (mirror the [/uzklausos/loading.tsx:18-39](src/app/uzklausos/loading.tsx:18) shape but slimmer — no description preview, since user's own list omits that) |

### E. Refactor scope

Estimate: **2 hours**.

1. Convert `page.tsx` to server; build `UserSessionGate` (or a role-less
   `<SessionGate>` variant — see §Cross-cutting).
2. Extract `MyRequestsList.tsx` (async server); build
   `MyRequestsListSkeleton`.

**Lines changed:** ~228 deleted, ~280 added. Net ~+50.

### F. Risks

- `NextActionHint` is pure — stays sync. No realtime today (reload to see
  new responses) — out of scope.

---

## Page 10: `/paskyra/zinutes` (user's inquiries)

**Current state**: [src/app/paskyra/zinutes/page.tsx](src/app/paskyra/zinutes/page.tsx:18-35)
is Pattern B — session gate works, but the actual data view
[SentInquiriesView.tsx](src/app/paskyra/zinutes/SentInquiriesView.tsx)
(205 lines) is `"use client"` and fetches `/api/paskyra/zinutes` in
`useEffect`. So the gate streams quickly, but the data still arrives via a
client round-trip.

### A. Section inventory

1. **Breadcrumb** — STATIC "← Paskyra" link
2. **Page header** — "Žinutės" title + dynamic subtitle (unread count or
   generic)
3. **Filter tabs** (conditional on conversations) — Visi / Neperskaityti
   with unread count badge
4. **Conversation list** — each row: provider avatar with presence +
   unread dot + provider name + "Tiesioginė" badge + message preview +
   presence label + relative date
5. **Empty state** — varies by filter (no conversations vs no unread)

### B. Data dependency per section

| # | Section            | Source                                                                                                    | Session-dep | Cached? | Cost                              |
|---|--------------------|-----------------------------------------------------------------------------------------------------------|-------------|---------|-----------------------------------|
| 1 | Breadcrumb         | STATIC                                                                                                    | no          | n/a     | <1ms                              |
| 2 | Header             | derived from §4 (unread count)                                                                            | yes         | shared  | <1ms                              |
| 3 | Filter tabs        | derived from §4                                                                                           | yes         | shared  | <1ms                              |
| 4 | Conversation list  | `prisma.directInquiry.findMany({ senderUserId, include: { provider.{name, image, lastSeenAt, providerProfile.{images, heroImageUrl}}, messages: take 1 } })` + `prisma.notification.findMany({ userId, type: NEW_MESSAGE, isRead: false })` (parallel) | yes | no | **500-800ms** (heavy join)        |
| 5 | Empty state        | derived from §4                                                                                           | yes         | shared  | <1ms                              |

### C. Proposed Suspense layout

The session gate already exists and works. The remaining win is making
`SentInquiriesView` a server component that fetches inline:

```tsx
// src/app/paskyra/zinutes/page.tsx (unchanged structure, just replace SentInquiriesView)
export default function SentInquiriesPage() {
  return (
    <Suspense fallback={<InquiriesListSkeleton />}>
      <SessionGate />
    </Suspense>
  );
}

async function SessionGate() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect(`/prisijungti?callbackUrl=${encodeURIComponent("/paskyra/zinutes")}`);
  if (session.user.role === "PROVIDER") redirect("/tiekejas/zinutes");
  return <SentInquiriesView userId={session.user.id} />;  // now an async server component
}
```

**Two changes from today**: fallback goes from `null` →
`<InquiriesListSkeleton />` (structure, not blank), and `SentInquiriesView`
becomes an async server component that fetches inline.

### D. Skeleton mapping

| Boundary             | Fallback                  | Shape                                                                                                |
|----------------------|---------------------------|------------------------------------------------------------------------------------------------------|
| `SessionGate`         | `InquiriesListSkeleton`   | NEW — header (`h-7 w-32`) + tab strip (`h-9 w-24` x2) + 5 conversation rows (avatar circle + 2 text lines + timestamp) |

### E. Refactor scope

Estimate: **1.5 hours**.

1. Convert `SentInquiriesView.tsx` to async server, taking `userId` as a
   prop instead of `useSession()`.
2. Filter tabs become `<Link href="?tab=unread">`; build
   `InquiriesListSkeleton`; point the `page.tsx` fallback at it.

**Lines changed:** ~205 deleted, ~230 added. Net ~+25.

### F. Risks

- **Presence indicator** and **notification-derived unread state** are
  static after load — same as today, out of scope to make live.

---

## Page 11: `/uzklausos/sekti/[id]` (request tracker — anonymous + logged-in)

**Current state**: [src/app/uzklausos/sekti/[id]/page.tsx](src/app/uzklausos/sekti/[id]/page.tsx:1-12)
is Pattern A — thin server + one Suspense wrapping
[TrackRequestClient.tsx](src/app/uzklausos/sekti/[id]/TrackRequestClient.tsx)
(530 lines, `"use client"`). The client fetches `/api/requests/[id]` in
`useEffect`. **This page also has Supabase realtime postgres_changes
subscriptions inside ThreadChat** — Suspense doesn't govern those.

Special: **public** (no session required), but session state changes the
UI (claim CTA, account-value box). Viewable by the owner (logged-in) and
anyone with the tracking token (anonymous).

### A. Section inventory

1. **Header with badge + title** — status badge, category, title,
   metadata (location, date, budget, deadline)
2. **Status timeline** — 4-step visual progress (PENDING_CONFIRMATION →
   OPEN → IN_PROGRESS → CLOSED) — STATIC, derived
3. **Moderation/delivery alert banners** (conditional)
4. **View count indicator** ("Viewed by N vendors")
5. **Account value box** (conditional, session-dependent) — CTA for
   guest users to claim the request or create an account
6. **Bookmark reminder** (conditional, anonymous users only)
7. **Request description card** — full text + RequestPhotos attachments
8. **Empty state / proposals empty** — if no responses yet
9. **Filter + sort toolbar** (conditional, only if >3 proposals)
10. **Proposal cards list** — each card (collapsible) with expandable
    ThreadChat
11. **Action buttons row** — Edit / Close / Delete (status-dependent)
12. **Account-to-request claim UI** — embedded inside §5

### B. Data dependency per section

| #  | Section                | Source                                                                          | Session-dep | Cached? | Cost                                  |
|----|------------------------|---------------------------------------------------------------------------------|-------------|---------|---------------------------------------|
| 1  | Header                 | `prisma.serviceRequest.findFirst({ trackingToken, include: { categoryRef, attachments } })` | no         | no      | ~100-150ms                            |
| 2  | Status timeline        | derived from §1.status                                                          | no          | shared  | <1ms                                  |
| 3  | Alerts                 | derived from §1.{moderationStatus, status}                                     | no          | shared  | <1ms                                  |
| 4  | View count             | from §1 (already-stored counter)                                                | no          | shared  | <1ms                                  |
| 5  | Account value box      | `session?.user`                                                                 | yes         | n/a     | <1ms (session lookup)                 |
| 6  | Bookmark reminder      | `!session`                                                                      | yes         | shared  | <1ms                                  |
| 7  | Description + photos   | from §1                                                                         | no          | shared  | included                              |
| 8  | Empty proposals        | derived from §10                                                                | no          | shared  | <1ms                                  |
| 9  | Toolbar                | derived from §10.length                                                         | no          | shared  | <1ms                                  |
| 10 | Proposal list          | `prisma.response.findMany({ requestId, include: { provider.{name, image}, messages.{content, senderId, createdAt} } })` | no | no | **300-700ms** (depends on # of proposals) |
| 11 | Action buttons         | derived from §1.{status, clientId} + session                                    | yes         | shared  | <1ms                                  |
| 12 | Claim UI               | inside §5                                                                       | yes         | shared  | <1ms                                  |

### C. Proposed Suspense layout

```tsx
// src/app/uzklausos/sekti/[id]/page.tsx
import { Suspense } from "react";
import { RequestHeader, RequestHeaderSkeleton } from "./sections/RequestHeader";
import { RequestBody, RequestBodySkeleton } from "./sections/RequestBody";
import { ProposalsSection, ProposalsSectionSkeleton } from "./sections/ProposalsSection";
import { ViewerBanner } from "./ViewerBanner";  // "use client" — reads session

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TrackRequestPage({ params }: PageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      {/* Header: cheap, paints first */}
      <Suspense fallback={<RequestHeaderSkeleton />}>
        <RequestHeader trackingToken={params} />
      </Suspense>

      {/* Viewer banner: client island, reads session, renders claim CTA
          or bookmark reminder. Renders synchronously — no fetch. */}
      <ViewerBanner trackingToken={params} />

      {/* Body: description + attachments + view count */}
      <Suspense fallback={<RequestBodySkeleton />}>
        <RequestBody trackingToken={params} />
      </Suspense>

      {/* Proposals: slowest, can stream last */}
      <Suspense fallback={<ProposalsSectionSkeleton />}>
        <ProposalsSection trackingToken={params} />
      </Suspense>
    </div>
  );
}
```

**Public page**: no `<SessionGate>` — server sections fetch directly by
`trackingToken`. The client `<ViewerBanner>` reads session via
`useSession()` and toggles claim CTA / bookmark reminder / nothing,
synchronously, re-rendering when session changes.

### D. Skeleton mapping

| Boundary               | Fallback                       | Shape                                                                                                       |
|------------------------|--------------------------------|-------------------------------------------------------------------------------------------------------------|
| `RequestHeader`        | `RequestHeaderSkeleton`        | Reuse [src/app/uzklausos/sekti/[id]/loading.tsx:6-23](src/app/uzklausos/sekti/[id]/loading.tsx:6) — header card with title + status badges + meta |
| `RequestBody`          | `RequestBodySkeleton`          | Reuse [src/app/uzklausos/sekti/[id]/loading.tsx:35-40](src/app/uzklausos/sekti/[id]/loading.tsx:35) — paragraph + divider |
| `ProposalsSection`     | `ProposalsSectionSkeleton`     | Reuse [src/app/uzklausos/sekti/[id]/loading.tsx:25-43](src/app/uzklausos/sekti/[id]/loading.tsx:25) — 3 proposal cards with avatar + 2 lines |

### E. Refactor scope

Estimate: **4-5 hours** (most complex page after `/tiekejas` root).

1. Split `TrackRequestClient.tsx` (530 lines) into 3 server sections +
   `ViewerBanner` (client island). ThreadChat stays a client leaf in
   `ProposalsSection` (see §F).
2. Move data fetching out of `/api/requests/[id]` (endpoint stays for
   mobile clients; grep first).
3. Pre-compute schema.org/LD-JSON in `RequestHeader` — bonus SEO win.
4. Split loading.tsx into per-section skeletons (per §Cross-cutting).

**Lines changed:** ~530 deleted, ~700 added across 3 sections + viewer
banner. Net ~+170.

### F. Risks

- **Supabase realtime in ThreadChat** (scoped to expanded proposal cards)
  stays a `"use client"` leaf inside `ProposalsSection`. Server pre-fetches
  initial messages as a prop; the client subscribes for updates. Suspense
  and realtime coexist fine — the server doesn't need to know about it.
- **`ViewerBanner` session** is client-side (`useSession()`). Render
  nothing while session loads, to avoid flashing the "create account" CTA
  at logged-in users.
- **Claim flow** + **Edit/Close/Delete actions** stay in client islands
  (`ViewerBanner` / `ProposalsSection`) that read session.

---

## Page 12: `/meistrai/[slug]` (public provider profile)

**Current state**: [src/app/meistrai/[slug]/page.tsx](src/app/meistrai/[slug]/page.tsx:168-176)
is **Pattern D — already mature**: server-rendered with three Suspense
boundaries:

- Outer wraps `ProfileContent` (fallback: `null`)
- Inner for `ReviewsSection` (fallback: `<SectionSkeleton title="Atsiliepimai" />`)
- Inner for `SimilarProvidersSection` (fallback: `<SectionSkeleton title="Panašūs tiekėjai" />`)

The hero + sidebar use cached `getProviderProfile()` (60s TTL,
`cacheTag("providers", "provider:user:{id}")`).

### A. Section inventory (already enumerated in detail elsewhere — abbreviated)

1. Breadcrumb (STATIC)
2. Moderation banner (owner-only preview, derived from session)
3. Welcome banner (search param)
4-10. Hero + meta + quick facts + description + gallery + pricing +
   services (all from cached `getProviderProfile()`)
11. **Reviews section** — in its own Suspense
12. **Similar providers section** — in its own Suspense
13-17. Sidebar (TrustStats, DirectInquiryWidget, TrustSignals) — synchronous

### B. Data dependency per section

| #     | Section                  | Source                                                                                                | Session-dep | Cached?     | Cost                              |
|-------|--------------------------|-------------------------------------------------------------------------------------------------------|-------------|-------------|-----------------------------------|
| 1     | Breadcrumb               | STATIC                                                                                                | no          | n/a         | <1ms                              |
| 2     | Moderation banner        | `session?.user?.id === provider.id` + `provider.moderationStatus`                                     | **yes**     | partial     | <1ms                              |
| 3     | Welcome banner           | `searchParams.welcome === "1"`                                                                        | no          | n/a         | <1ms                              |
| 4-10  | Hero + sidebar (stats)   | `getProviderProfile(providerUserId)` from [page.tsx:720-727](src/app/meistrai/[slug]/page.tsx:720)    | no (data) + yes (owner CTA toggle) | **CACHED** (60s)  | ~50-150ms cold, ~5ms warm        |
| 11    | Reviews                  | `prisma.review.findMany({ providerId, moderationStatus: APPROVED, take: N })` inside `ReviewsSection` | no          | **NOT CACHED** | ~100-400ms                  |
| 12    | Similar providers        | `prisma.user.findMany({ where: { providerProfile.categories.contains: ..., location: ... } })` inside `SimilarProvidersSection` | no | **NOT CACHED** | ~150-500ms |
| 13-17 | Sidebar trust stats      | derived from §4-10                                                                                    | partial     | shared      | included                          |

### C. Proposed changes

The page is mostly correct. One change to make, one tempting change to skip:

1. **`SKIP` — splitting the owner-preview check into its own boundary.**
   Today [page.tsx:202-207](src/app/meistrai/[slug]/page.tsx:202)
   `Promise.all`s the session lookup alongside the cached hero data, so
   the cached hero is gated behind a ~30-80ms session read. Tempting to
   stream the hero first and let an `<OwnerOverlay>` resolve session
   separately — **but** for a non-APPROVED provider, the hero would then
   leak to non-owners during the window before the 404 renders. That's a
   privacy regression for a marginal speedup. Keep session in the
   `Promise.all`. Marked `SKIP`.

2. **`DO` — add `'use cache'` to `ReviewsSection` and
   `SimilarProvidersSection`.** Both are public data (approved reviews,
   public providers) that don't vary per-user. Wrap with a 5-minute
   revalidate + tags. **Use the EXISTING tag convention, not new names**:
   `cacheTag("reviews", \`reviews:user:${id}\`)` (matches the already-cached
   reviews fetcher at [page.tsx:899-901](src/app/meistrai/[slug]/page.tsx:899)
   and the `revalidateTag('reviews:user:${providerId}')` follow-up in
   [NOTES.md:34](NOTES.md:34)) and `cacheTag("providers", \`provider:user:${id}\`)`
   (matches `getProviderProfile`). Do NOT introduce `reviews:provider:` or
   `providers-listing` — they would not match the invalidation hooks. Aligns
   with the existing
   [getProviderProfile](src/app/meistrai/[slug]/page.tsx:720) pattern and
   the cache-busting tags noted in [NOTES.md:26-38](NOTES.md:26). This is
   the only real win on this already-mature page.

### D. Skeleton mapping

| Boundary                     | Fallback                                         | Status                       |
|------------------------------|--------------------------------------------------|------------------------------|
| `ProfileContent` (outer)     | `null`                                           | Unchanged                    |
| `ReviewsSection`             | `<SectionSkeleton title="Atsiliepimai" />`       | Unchanged                    |
| `SimilarProvidersSection`    | `<SectionSkeleton title="Panašūs tiekėjai" />`   | Unchanged                    |

### E. Refactor scope

Estimate: **1 hour** (just the cache wrapping).

1. Wrap `ReviewsSection`'s inner fetch in `'use cache'; cacheLife({ revalidate: 300 }); cacheTag("reviews", "reviews:provider:{id}");`
2. Wrap `SimilarProvidersSection`'s inner fetch similarly.
3. Document the new cache tags in `NOTES.md` (so the existing follow-up
   to wire `revalidateTag` for review approvals points at the right
   tag).

**Lines changed:** ~15 added across 2 files.

### F. Risks

- **Cache freshness**: a new review takes up to 5 minutes to appear.
  Mitigation: the [NOTES.md](NOTES.md:26) follow-up to add
  `revalidateTag("reviews:user:${providerId}")` on review approval is
  the canonical fix. Both can ship together as a small "cache wiring"
  PR independent of the Suspense work.
- **Owner-preview split**: marked `SKIP` above — explicitly do NOT
  attempt this in the Suspense PRs.

---

## Cross-cutting changes

### New skeleton components

Centralize under `src/components/ui/skeletons/` for reuse:

| File                                  | Used by                                              | Shape                                                                                                |
|---------------------------------------|------------------------------------------------------|------------------------------------------------------------------------------------------------------|
| `AccountCardSkeleton.tsx`             | `/tiekejas` §1                                       | 11x11 avatar + 2 text lines + 24w status pill                                                        |
| `StatsGridSkeleton.tsx`               | `/tiekejas` §2                                       | 4 stat tiles in a grid                                                                               |
| `ProfileCompletenessSkeleton.tsx`     | `/tiekejas` §3                                       | progress bar + 3 missing-item rows                                                                   |
| `RecentMatchingRequestsSkeleton.tsx`  | `/tiekejas` §4                                       | 3 lead-card rows                                                                                     |
| `RecentReviewsSkeleton.tsx`           | `/tiekejas` §6                                       | 3 review-row skeletons                                                                               |
| `FollowUpsSkeleton.tsx`               | `/tiekejas` §7                                       | header + 3 follow-up rows                                                                            |
| `CreditBadgeSkeleton.tsx`             | `/tiekejas/uzklausos` header                         | small 8x32 pill                                                                                      |
| `ConversationListSkeleton.tsx`        | `/tiekejas/zinutes`                                  | 5 conversation rows: dot + title + snippet + timestamp                                              |
| `ResponsesListSkeleton.tsx`           | `/tiekejas/atsakymai`                                | 4 tab pills + 5 response rows                                                                        |
| `ThreadViewSkeleton.tsx`              | `/tiekejas/zinutes/[id]`                             | header + contact card + 4 message rows + sticky input                                                |
| `MyRequestsListSkeleton.tsx`          | `/paskyra/uzklausos`                                 | 5 tab pills + 5 request cards                                                                        |
| `InquiriesListSkeleton.tsx`           | `/paskyra/zinutes`                                   | header + 2 tab pills + 5 rows (avatar + 2 lines + timestamp) — distinct from ConversationList (avatar vs. dot) |

The existing inline skeletons inside page.tsx files (`DashboardSkeleton`,
`RequestsListSkeleton`, `RequestDetailSkeleton`, `ProfileFormSkeleton`,
`TrackRequestSkeleton`) move out of `page.tsx` and either become reusable
components in `src/components/ui/skeletons/` or are split into smaller
per-section components named in this table.

### `<SessionGate>` helper

New file: **`src/components/auth/SessionGate.tsx`** — ONE generic file (per C3),
imported by both `/tiekejas/*` and `/paskyra/*`. Do not create per-area copies.
It MUST be rendered inside a `<Suspense>` (per C1).

Render-prop pattern:

```tsx
// Conceptual signature — actual API may differ
type SessionGateProps = {
  requireRole?: "PROVIDER" | "ADMIN" | "USER";
  fallback?: ReactNode;
  children: (userId: string) => ReactNode;
};

export async function SessionGate({ requireRole, fallback, children }: SessionGateProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect(`/prisijungti?callbackUrl=...`);
  }
  if (requireRole && session.user.role !== requireRole) {
    if (session.user.role === "ADMIN") redirect("/admin");
    if (requireRole === "PROVIDER") redirect("/tapti-tiekeju");
    redirect("/");
  }
  return children(session.user.id);
}
```

This MUST live outside any data Suspense — its `redirect()` calls fire
before any skeleton paints.

**Note**: `/uzklausos/sekti/[id]` is public — does NOT use SessionGate
(uses `useSession()` in a client island for the viewer banner).

### Shared splitting pattern (the "Task F upgrade")

Each Pattern A/C page follows the same refactor recipe:

1. `page.tsx` (server, ~30 lines): static header (paints with shell) +
   `<SessionGate>{(userId) => ...}</SessionGate>` + multiple
   `<Suspense fallback={<XSkeleton />}>` boundaries.
2. `sections/X.tsx` (server async, ~50-200 lines each): one per
   independent query. Takes `userId` + minimal other props. Does its own
   Prisma read. Renders the section's UI directly (server-rendered).
3. `*Island.tsx` or `*Shell.tsx` (`"use client"`, leaf): for
   interactive UI only — filter controls, forms, modal triggers. Receives
   server-fetched initial data as props.

### Cache tag wiring (out-of-scope, but document)

The `'use cache'` directives proposed for `ReviewsSection` and
`SimilarProvidersSection` should add cache tags so the existing
[NOTES.md follow-up](NOTES.md:26) to wire `revalidateTag()` on review
approval + provider profile update works correctly:

| Function                       | Tag (use EXISTING convention — see Page 12 §C2)   |
|--------------------------------|---------------------------------------------------|
| `ReviewsSection` inner fetch   | `cacheTag("reviews", \`reviews:user:${id}\`)`     |
| `SimilarProvidersSection`      | `cacheTag("providers", \`provider:user:${id}\`)`  |

### What we explicitly do NOT do

- **Don't add Suspense to `/tiekejas/profilis`** — see §Page 6.
- **Don't split `/meistrai/[slug]` owner-preview into its own boundary**
  — privacy regression, see §Page 12.
- **Don't refactor `<Header />` or `<MobileBottomNav />`** — they're
  already correctly Suspense-wrapped in `layout.tsx`.
- **Don't add Suspense around static sections** (page titles,
  breadcrumbs, marketing copy) — they paint with the shell.
- **Don't add Suspense around already-cached data** (e.g.
  `getServiceCategoryGroups()`) — the cache resolves in ~1ms warm; the
  boundary overhead exceeds the win.

---

## Execution order

Ranked by **UX impact × refactor risk** ascending (high-impact and
low-risk first, so we ship value fast and earn confidence for the
heavier work):

| #  | Page                          | Why this order                                                                                                   | Effort  |
|----|-------------------------------|------------------------------------------------------------------------------------------------------------------|---------|
| 1  | `/paskyra/profilis`           | Already Pattern B; the change is just hoisting the header out of the Suspense — proves the layout-hoist pattern. | 30 min  |
| 2  | `/meistrai/[slug]` cache tags | Wraps `ReviewsSection` + `SimilarProvidersSection` in `'use cache'`. Tiny diff, immediate win on the most-trafficked public page. | 1 hr |
| 3  | `/tiekejas/atsakymai`         | Smallest provider page (251 lines). Single fetch, clean Pattern A→B conversion. Proves the SessionGate + thin server + URL-driven tabs pattern. | 1.5 hr |
| 4  | `/tiekejas/zinutes/[id]`      | Same simple pattern. Validates that single-boundary pages are correctly sized. | 1.5 hr |
| 5  | `/paskyra/zinutes`            | SessionGate already exists; just convert the view to server. Skeleton mirrors PR 3's conversation-row shape. | 1.5 hr |
| 6  | `/tiekejas/zinutes`           | First Pattern C→B conversion. Validates URL-driven filter tabs at scale. | 2 hr    |
| 7  | `/paskyra/uzklausos`          | Second Pattern C→B conversion. Validates UserSessionGate / cross-role guard. | 2 hr    |
| 8  | `/uzklausos/sekti/[id]`       | Higher complexity (realtime, public, anonymous-vs-logged-in). But the proposal stream is high-leverage UX. | 4-5 hr  |
| 9  | `/tiekejas/uzklausos/[id]`    | Detail page with copilot + unlock + thread chat. Three boundaries. Risk: keeping AI + realtime + form interactivity working through the refactor. | 3-4 hr |
| 10 | `/tiekejas/uzklausos`         | Filter UX risk (server round-trip vs local-first). Ship the simple version first, measure, layer optimism later. | 3-4 hr |
| 11 | `/tiekejas` root              | Biggest refactor (878-line client component split). High UX impact, but earlier PRs have proven the pattern. Ship last. | 6-8 hr |
| —  | `/tiekejas/profilis`          | **OUT OF SCOPE** — needs a separate "convert to Pattern B" workstream before any Suspense boundaries make sense. Track as a NOTES.md follow-up. | n/a |

**Rationale**: prove the pattern on low-risk pages first (1-5), expand to
medium complexity (6-8), then tackle the high-impact rebuilds last (9-11) —
each step grows the shared skeleton library and the executor's confidence.

---

## Merge strategy

**Recommendation: 7 PRs**, one per logical cluster, branched from `main`:

| #  | Branch                                      | PRs bundles                                                       | Why                                                                |
|----|---------------------------------------------|-------------------------------------------------------------------|--------------------------------------------------------------------|
| 1  | `suspense/foundation-and-paskyra-profilis`  | Skeleton lib scaffold, generic `<SessionGate>`, `/paskyra/profilis` header hoist | Foundational utilities + one polish change to validate them    |
| 2  | `suspense/meistrai-cache-tags`              | `'use cache'` on `ReviewsSection` + `SimilarProvidersSection`     | Independent, no Suspense changes — can ship parallel to PR 1       |
| 3  | `suspense/provider-secondary`               | `/tiekejas/atsakymai`, `/tiekejas/zinutes/[id]`, `/tiekejas/zinutes` | All three are Pattern C/A→B conversions of small/medium pages. Share `ConversationListSkeleton`. |
| 4  | `suspense/user-cluster`                     | `/paskyra/zinutes`, `/paskyra/uzklausos`                          | Both user-side. Share `UserSessionGate` and conversation/list skeletons. |
| 5  | `suspense/tracker-page`                     | `/uzklausos/sekti/[id]`                                           | Largest single-page refactor outside `/tiekejas`. Public page, realtime considerations — isolated to limit blast radius. |
| 6  | `suspense/provider-request-detail`          | `/tiekejas/uzklausos/[id]`                                        | Detail page rebuild with 3 boundaries. Touches copilot + unlock + thread chat — many surface areas. |
| 7  | `suspense/provider-dashboard`               | `/tiekejas/uzklausos` list, `/tiekejas` root                      | The two highest-impact provider pages. List goes first as a stepping stone (proves the filter pattern), then the full dashboard. |

**Each PR's checklist** (template):

- [ ] All target pages still gate on auth (verify with logged-out
      `curl` and `403` from API routes)
- [ ] `pnpm build` passes — including any Prisma generate
- [ ] Page renders to functional UI for: anonymous (where allowed),
      USER, PROVIDER, ADMIN
- [ ] Lighthouse / network tab confirms multi-stage streaming
      (use Vercel preview, check the response stream)
- [ ] No regressions to existing `/api/...` endpoints unless documented
- [ ] `AGENT_LOG.md` updated per [AGENTS.md:144](AGENTS.md:144)
- [ ] `NOTES.md` updated if any out-of-scope work is uncovered

**No merge to `main` without QA on Vercel preview.** Per [NOTES.md
Phase 5](NOTES.md:146), push to a staging branch first, verify on the
preview URL with a real provider account, then merge.

**Branch independence (corrected per C3)**: PR 1 and PR 2 are independent.
**PRs 3-7 all depend on PR 1** (SessionGate at `src/components/auth/` + the
skeleton lib) being merged first — including PR 3, which imports the generic
SessionGate. Within 3-7, each is independent of the others except for shared
skeleton additions (which rebase cleanly). Ship PR 1 first; then 2-7 can run in
parallel worktrees.

---

## Definition of done (for the executor agent)

For each page in the plan above, "done" means:

1. The `page.tsx` is a server component with `<SessionGate>` (or
   public-page equivalent) at the top.
2. Each section identified in §A renders inside the correct Suspense
   boundary (or synchronously if marked STATIC/CACHED).
3. Each Suspense fallback uses the skeleton component named in §D.
4. The skeleton matches the real layout so there is **no CLS** when
   data arrives — verify with browser dev tools "Layout shift regions"
   overlay.
5. All existing functionality works: forms submit, links navigate,
   buttons trigger the same APIs, realtime updates still arrive,
   redirects still fire for unauthorized users.
6. Build passes, Vercel preview deploys, manually tested on
   `?debug-network=slow-3g` (or similar throttle) to **see** the
   multi-stage fill-in.

**NOT done if** the user perceives one "loading spinner → everything
appears" transition — that means the boundaries are wrong (too few, or
fanning out the same query).
