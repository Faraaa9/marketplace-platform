# Suspense streaming — execution prompts

Each block below is a **self-contained prompt for a fresh Claude Code window**.
The spawned agent has no memory of the planning conversation — everything it
needs is in the prompt + the files it points to.

## Dispatch model

- **MERGED to `main` @ `e1a07d6` (2026-05-28):** the `sharp` dep fix
  (`4961710`), PR1 foundation (`SessionGate` + skeleton-lib home + profilis
  hoist), and PR2 (meistrai cache tags). `origin/main` now has
  `src/components/auth/SessionGate.tsx` and `src/components/ui/skeletons/`, so
  PR3-7 can branch from it.
- **Now, in parallel (up to 5 windows):** PR3, PR4, PR5, PR6, PR7. All branch
  from the updated `origin/main`. They are independent of each other except for
  shared skeleton-file additions (which rebase cleanly — different filenames).
- Every agent works in its **own git worktree**, pushes a branch, and **stops
  before merging.** You review + merge in order.

Source of truth: `SUSPENSE_PLAN.md`. It is **untracked** (lives only in the main
worktree), so each prompt tells the executor to read it at the absolute path
`/Users/judyanncastillo/Documents/Projects/marketplace-platform/SUSPENSE_PLAN.md`.
Its `## Corrections` section (C1–C5) overrides any conflicting inline code
sample — agents read it first.

---

## PR 1 — Foundation: `SessionGate` + skeleton-lib home + `/paskyra/profilis` header hoist  ✅ MERGED (`1c39296`)

Branch: `suspense/foundation-and-paskyra-profilis` (merged to main, branch deleted)

```
You are working on paslaugurinka.lt, a live Next.js 16 App Router marketplace at
~/Documents/Projects/marketplace-platform. `cacheComponents: true` (PPR) is
enabled in prod. Conventions: TypeScript strict (no `any`), pnpm for local dev,
no emojis in code or commits, plain-language explanations.

CONTEXT
This is the FOUNDATION PR of a multi-PR effort to add granular Suspense
streaming to per-user pages. The full plan is SUSPENSE_PLAN.md at the repo root.
You are building the two shared utilities that PRs 3–7 depend on, plus one small
polish change that exercises the "hoist static chrome out of Suspense" pattern.
This PR must land before PRs 3–7 start.

SETUP (create an isolated worktree first)
  cd ~/Documents/Projects/marketplace-platform
  git fetch origin
  git worktree add -b suspense/foundation-and-paskyra-profilis ../mp-suspense-foundation origin/main
  cd ../mp-suspense-foundation
(The sibling path is a suggestion — adjust if you prefer.)

READ FIRST, IN THIS ORDER
1. AGENTS.md — project conventions.
2. SUSPENSE_PLAN.md → the `## Corrections` section (C1–C5) IN FULL, then
   §Page 8 (/paskyra/profilis) and §Cross-cutting (SessionGate helper +
   skeleton list).
3. src/app/paskyra/zinutes/page.tsx — the existing page-local SessionGate
   pattern you are generalizing (async fn inside <Suspense fallback={null}>,
   getServerSession, redirect).
4. src/app/paskyra/profilis/page.tsx — the page you will edit (Pattern B today,
   ~76 lines, inline ProfileFormSkeleton at the bottom).
5. src/proxy.ts — see what auth gating already happens at the edge (your gate is
   partly defense-in-depth; do not contradict the proxy's redirect targets).
6. Cache Components docs (your training data is unreliable — read them):
   https://nextjs.org/docs/app/getting-started/cache-components

TASK 1 — Generic SessionGate at src/components/auth/SessionGate.tsx
- Async server component, render-prop. Approx contract:
    type SessionGateProps = {
      requireRole?: "PROVIDER" | "ADMIN" | "USER";
      callbackUrl?: string;            // post-login return path; default "/"
      children: (userId: string) => ReactNode;
    };
- Behavior: getServerSession(authOptions) (authOptions from "@/lib/auth").
  - No session → redirect(`/prisijungti?callbackUrl=${encodeURIComponent(callbackUrl)}`).
  - requireRole mismatch → redirect to a sensible destination (ADMIN→"/admin",
    PROVIDER required but USER→"/tapti-tiekeju", else "/"). VERIFY these targets
    against the existing redirects in paskyra/zinutes and the tiekejas pages so
    you match current behavior.
  - Success → return children(session.user.id).
- Add a top-of-file comment: "Render this INSIDE a <Suspense> — it is async and
  reads the session (dynamic under cacheComponents). Never place it in a layout."
- Do NOT read cookies/headers/searchParams inside any 'use cache' function
  (general rule; not needed here).

TASK 2 — Skeleton-lib home at src/components/ui/skeletons/
- Create src/components/ui/skeletons/index.ts as the barrel.
- Top comment documenting the convention: compose every skeleton from the
  `Skeleton` (DEFAULT export) and `SkeletonCard` (named export) primitives in
  src/components/ui/Skeleton.tsx; one file per shape; each later PR adds the
  skeletons its pages need and re-exports here.
- Do NOT pre-build page-specific skeletons speculatively. Each page PR builds and
  verifies its own skeletons against the real layout (plan DoD: skeleton must
  match layout → no CLS). PR1 only establishes the home + convention.

TASK 3 — /paskyra/profilis header hoist (per §Page 8)
- Today the static header sits inside the Suspense/loader and is absent during
  load. Extract a sync <ProfileHeader /> (or inline static markup) and render it
  ABOVE <Suspense fallback={<ProfileFormSkeleton/>}>.
- Slim the inline ProfileFormSkeleton to drop the heading lines (header now
  paints separately).
- This page does NOT use the new SessionGate — it keeps its own ProfileFormLoader
  doing the session read. The only change is the header hoist. Leave the loader.

LANDMINES (do not trip these)
- No `export const dynamic` / `revalidate` / `runtime` anywhere.
- No getServerSession in any layout.
- Do not touch src/app/api/auth/[...nextauth]/route.ts.
- Edit one file at a time (no batch sed/perl).
- `git status --short` before each commit (shared repo, concurrent agents).
- Do not merge, force-push, or amend. Create new commits only.

VERIFY
- `pnpm build` passes (cacheComponents prerender must not error).
- /paskyra/profilis: header paints immediately, form streams beneath it;
  logged-out user is still redirected; logged-in USER sees their data in the form.
- SessionGate compiles. Optionally drop a 3-line scratch usage in a throwaway
  route to confirm it redirects, then delete it before committing. (First real
  page consumer is PR3.)

FINISH
- Commit atomically (1–3 commits). Update AGENT_LOG.md per AGENTS.md.
- Push the branch and report it (or open a PR). DO NOT MERGE TO main.
- If you uncover out-of-scope work, add it to NOTES.md (do not fix inline).
```

---

## PR 2 — `/meistrai/[slug]` cache tags  ✅ MERGED (`e1a07d6`)

Branch: `suspense/meistrai-cache-tags` (merged to main, branch deleted)

```
You are working on paslaugurinka.lt, a live Next.js 16 App Router marketplace at
~/Documents/Projects/marketplace-platform. `cacheComponents: true` (PPR) is
enabled in prod. Conventions: TypeScript strict (no `any`), pnpm for local dev,
no emojis in code or commits.

CONTEXT
The public provider profile page /meistrai/[slug] is already a mature
server-rendered page with Suspense boundaries. Two of its sections still hit the
DB uncached on every request: the review list and the similar-providers list.
This PR wraps both in `'use cache'` using the project's EXISTING cache-tag
convention. No Suspense changes, no dependency on any other PR — safe to run in
parallel with the foundation PR. Full context: SUSPENSE_PLAN.md §Page 12.

SETUP (isolated worktree)
  cd ~/Documents/Projects/marketplace-platform
  git fetch origin
  git worktree add -b suspense/meistrai-cache-tags ../mp-suspense-meistrai origin/main
  cd ../mp-suspense-meistrai

READ FIRST
1. AGENTS.md — conventions.
2. SUSPENSE_PLAN.md → §Page 12 (especially §C item 2 with the corrected tag
   note) and §Cross-cutting "Cache tag wiring".
3. src/app/meistrai/[slug]/page.tsx — the EXISTING `'use cache'` functions
   (import at line 7: `import { cacheLife, cacheTag } from "next/cache";`).
   Note the already-cached reviews fetcher around lines 899–901 using
   `cacheTag("reviews", `reviews:user:${providerId}`)`. Mirror this style and
   this tag convention.
4. src/app/meistrai/[slug]/components/ReviewsSection.tsx — does its own
   prisma.review.findMany (uncached, lines ~18–32); takes providerId, avgRating,
   totalReviews as props.
5. src/app/meistrai/[slug]/components/SimilarProvidersSection.tsx — same
   treatment.
6. `use cache` docs (training data unreliable — read):
   https://nextjs.org/docs/app/api-reference/directives/use-cache

IMPLEMENTATION
- ReviewsSection: extract the prisma.review.findMany into a module-level async
  function:
      async function getApprovedReviews(providerId: string) {
        "use cache";
        cacheLife({ revalidate: 300 });
        cacheTag("reviews", `reviews:user:${providerId}`);
        return prisma.review.findMany({ /* same select/where/orderBy/take */ });
      }
  Call it from the component. The cached fn takes ONLY providerId (its cache key)
  and must NOT read session/cookies/headers/searchParams. The component still
  renders avgRating/totalReviews props as before.
  CHECK FIRST: if the existing cached reviews fetcher at page.tsx:899 already
  returns the shape ReviewsSection needs, prefer sharing it over duplicating. If
  the selects differ, add the new fn but REUSE the same tag `reviews:user:${id}`.
- SimilarProvidersSection: same pattern. cacheLife({ revalidate: 300 });
  cacheTag("providers", `provider:user:${id}`)  (matches getProviderProfile).
- Do NOT touch the owner-preview Promise.all / session lookup — splitting it is a
  privacy regression (SKIP in §Page 12 §C1).
- Update NOTES.md: under the existing "Cache invalidation hooks neimplementuoti"
  follow-up, note that these two sections now also carry `reviews:user:${id}` and
  `provider:user:${id}` tags, so the planned revalidateTag wiring covers them.

LANDMINES
- Do NOT invent new tag names (`reviews:provider:`, `providers-listing`) — they
  would not match the revalidation hooks the project plans to add. Use the
  existing `reviews:user:` / `provider:user:` convention.
- No `dynamic`/`revalidate`/`runtime` exports. Edit one file at a time.
- `git status --short` before commit. No merge/force-push/amend.

VERIFY
- `pnpm build` passes.
- /meistrai/<approved-slug> renders reviews + similar providers identically to
  before; a second request is a cache HIT (faster, no DB read). A PENDING profile
  still 404s/redirects for non-owners (unchanged).

FINISH
- Commit, update AGENT_LOG.md, push the branch, report it. DO NOT MERGE TO main.
```

---

## Shared facts (true for every PR3-7 prompt below — already inlined in each)

The real, merged `SessionGate` (`src/components/auth/SessionGate.tsx`):

```tsx
import { Suspense } from "react";
import { SessionGate } from "@/components/auth/SessionGate";
// async → MUST live inside <Suspense>. Static chrome (headers, breadcrumbs,
// static titles, "Nauja" buttons) goes OUTSIDE it so it paints with the shell.
// Props: requireRole?: "PROVIDER" | "ADMIN" | "USER"; callbackUrl?: string ("/")
//        children: (userId: string) => ReactNode
// Redirects: no session -> /prisijungti?callbackUrl=…; role mismatch ->
//   ADMIN->"/admin", requireRole PROVIDER->"/tapti-tiekeju", else "/".
<>
  <PageHeader />
  <Suspense fallback={<PageSkeleton />}>
    <SessionGate requireRole="PROVIDER" callbackUrl="/tiekejas/...">
      {(userId) => (
        <>
          <Suspense fallback={<ASkeleton />}><A userId={userId} /></Suspense>
          <Suspense fallback={<BSkeleton />}><B userId={userId} /></Suspense>
        </>
      )}
    </SessionGate>
  </Suspense>
</>
```

Skeleton lib: add each shape as `src/components/ui/skeletons/<Name>.tsx`, compose
`import Skeleton from "@/components/ui/Skeleton"` (default) + `{ SkeletonCard }`
(named), and re-export from `src/components/ui/skeletons/index.ts`. The shape
MUST mirror the real layout so nothing shifts (no CLS) when data streams in.

`sharp` is now a declared dep, so deps resolve in fresh worktrees. For a local
`pnpm build` you must ALSO copy the gitignored env into the worktree first:
`cp ../marketplace-platform/.env ../marketplace-platform/.env.local .` — without
`DATABASE_URL` the cacheComponents prerender of `/api/meistrai/providers` fails.
(Vercel has the env, so its builds pass regardless.)

---

## PR 3 — provider secondary pages

Branch: `suspense/provider-secondary` · Pages: `/tiekejas/atsakymai`, `/tiekejas/zinutes/[id]`, `/tiekejas/zinutes`

```
You are working on paslaugurinka.lt, a live Next.js 16 App Router marketplace at
~/Documents/Projects/marketplace-platform. cacheComponents (PPR) is on in prod.
TypeScript strict (no any), pnpm, no emojis, plain-language.

CONTEXT
This is one PR in a multi-PR effort to add granular Suspense streaming to
per-user pages. The foundation (generic SessionGate + skeleton-lib home) is
already on main. You convert three small provider pages from
"client-fetches-in-useEffect" to "thin server page + SessionGate + streamed
server sections." Each is a single-fetch page, so each gets ONE data Suspense.

SETUP
  cd ~/Documents/Projects/marketplace-platform && git fetch origin
  git worktree add -b suspense/provider-secondary ../mp-pr3 origin/main
  cd ../mp-pr3 && pnpm install   # clean install; sharp is declared so this builds

READ FIRST
1. AGENTS.md.
2. /Users/judyanncastillo/Documents/Projects/marketplace-platform/SUSPENSE_PLAN.md
   → ## Corrections (C1-C5) IN FULL, then §Page 7 (atsakymai), §Page 5
   (zinutes/[id]), §Page 4 (zinutes). (Plan is untracked — read it at that
   absolute path; it is NOT in your worktree.)
3. src/components/auth/SessionGate.tsx — the gate you will use (see usage in the
   "Shared facts" block of EXECUTION_PROMPTS.md, also at the absolute path above).
4. The three current pages + their clients:
   - src/app/tiekejas/atsakymai/page.tsx + AtsakymaiClient.tsx (251 lines)
   - src/app/tiekejas/zinutes/[id]/page.tsx + IdClient.tsx (275 lines)
   - src/app/tiekejas/zinutes/page.tsx ("use client", 196 lines)

TASKS (all three: requireRole="PROVIDER"; static header OUTSIDE the gate's Suspense)
- /tiekejas/atsakymai (§Page 7): extract ResponsesList (async server, fetches all
  responses once, renders status tabs + filtered list). Tabs become
  <Link href="?status=…"> — URL-driven, no client JS. New skeleton
  ResponsesListSkeleton (4 tab pills + 5 response rows).
- /tiekejas/zinutes/[id] (§Page 5): extract ThreadView (async server, fetches the
  inquiry + messages in one query). Message input stays a "use client" leaf
  inside it; move the providerLastReadAt update into ThreadView as
  fire-and-forget. New skeleton ThreadViewSkeleton.
- /tiekejas/zinutes (§Page 4): convert the "use client" page to a server shell;
  extract ConversationList (async server, the merged response+directInquiry
  query) and InboxFilterShell ("use client", owns the tab UI, reads ?tab=).
  New skeleton ConversationListSkeleton.

KEY PATTERNS / LANDMINES
- C2: do NOT put searchParams/params in a Suspense `key`. Pass the searchParams
  Promise into the async section and `await` it there. URL-driven tabs are plain
  <Link>s; Next re-streams the section on navigation (transition keeps old UI).
- No realtime on these pages today — out of scope.
- Keep the existing /api/tiekejas/{atsakymai,zinutes,zinutes/[id]} routes unless
  you confirm nothing else (mobile?) calls them — grep before deleting.
- No dynamic/revalidate/runtime exports. No getServerSession in a layout. Don't
  touch [...nextauth]. Edit one file at a time. `git status --short` before
  commits (shared repo — other agents are editing main's working tree).

VERIFY
- `pnpm build` passes (clean worktree, sharp declared).
- Each page: shell + header paint immediately; list streams under a skeleton
  that matches the layout (no CLS); logged-out → redirect; non-PROVIDER →
  redirect; PROVIDER sees real data. Throttle network (slow-3g) to SEE the
  skeleton→content transition.

FINISH
- Commit atomically (per page). Update AGENT_LOG.md + NOTES.md (any out-of-scope
  finds go to NOTES, not inline). Push the branch, report it. DO NOT MERGE.
```

---

## PR 4 — user-side cluster

Branch: `suspense/user-cluster` · Pages: `/paskyra/zinutes`, `/paskyra/uzklausos`

```
[paslaugurinka.lt — same project/conventions as PR3 header.]

CONTEXT
Two user-facing pages. Same "client fetch -> streamed server section" conversion.
Both are single-fetch -> one data Suspense each. Foundation (SessionGate +
skeleton lib) is on main.

SETUP
  cd ~/Documents/Projects/marketplace-platform && git fetch origin
  git worktree add -b suspense/user-cluster ../mp-pr4 origin/main
  cd ../mp-pr4 && pnpm install

READ FIRST
1. AGENTS.md.
2. .../SUSPENSE_PLAN.md → Corrections (C1-C5), §Page 10 (paskyra/zinutes),
   §Page 9 (paskyra/uzklausos).
3. src/components/auth/SessionGate.tsx.
4. src/app/paskyra/zinutes/page.tsx (already Pattern B, has a LOCAL SessionGate
   fn) + SentInquiriesView.tsx (205 lines, "use client").
   src/app/paskyra/uzklausos/page.tsx ("use client", 227 lines).

TASKS
- /paskyra/zinutes (§Page 10): the page already gates correctly. Convert
  SentInquiriesView from "use client" to an async server component that fetches
  inline and takes userId as a prop. Change the page's Suspense fallback from
  `null` to a new InquiriesListSkeleton. Tabs -> <Link href="?tab=unread">.
  IMPORTANT: keep the page's existing cross-role redirect (PROVIDER ->
  /tiekejas/zinutes). The generic SessionGate's requireRole does NOT express that
  exact redirect, so either keep the page-local gate fn (recommended — just swap
  the view to server) or replicate the redirect precisely. Do not regress it.
- /paskyra/uzklausos (§Page 9): convert to server shell. BOTH USER and PROVIDER
  may view it (only the title differs by role), so use the generic SessionGate
  WITHOUT requireRole (auth only) and read role for the title + the
  ProviderRoleToggle. Extract MyRequestsList (async server). Status tabs ->
  <Link href="?status=…">. New skeleton MyRequestsListSkeleton.

KEY PATTERNS / LANDMINES
- C2: no searchParams in Suspense key — await inside the section.
- Role-derived title may stay inside the gate (resolves fast); purely-static
  chrome stays outside (C1).
- No realtime today (reload to see new). Presence/unread are static-after-load.
- Same global landmines as PR3 (no dynamic/revalidate/runtime, no layout
  session, no [...nextauth], one file at a time, git status before commit).

VERIFY / FINISH — same as PR3 (build, throttled streaming check, auth + cross-role
redirects, atomic commits, update AGENT_LOG/NOTES, push, DO NOT MERGE).
```

---

## PR 5 — request tracker (public + realtime)

Branch: `suspense/tracker-page` · Page: `/uzklausos/sekti/[id]`

```
[paslaugurinka.lt — same project/conventions.]

CONTEXT
The public request tracker. PUBLIC page (no SessionGate) viewable by the owner
(logged-in) or anyone with the tracking token. Session state only toggles a
claim CTA / bookmark reminder. This is the most complex page after the dashboard
root, mainly because of realtime. Foundation is on main.

SETUP
  cd ~/Documents/Projects/marketplace-platform && git fetch origin
  git worktree add -b suspense/tracker-page ../mp-pr5 origin/main
  cd ../mp-pr5 && pnpm install

READ FIRST
1. AGENTS.md.
2. .../SUSPENSE_PLAN.md → Corrections, §Page 11 (full — section inventory + the
   realtime risk notes).
3. src/app/uzklausos/sekti/[id]/page.tsx + TrackRequestClient.tsx (530 lines) +
   loading.tsx (reuse its shapes for the per-section skeletons).
4. src/components/messaging/ThreadChat.tsx — confirm it is a "use client"
   component with a Supabase postgres_changes subscription in useEffect (it is).

TASKS (§Page 11)
- NO SessionGate (public). Split TrackRequestClient into three async server
  sections fetched by trackingToken: RequestHeader, RequestBody, ProposalsSection
  — each in its own <Suspense> so the header paints first and the (slow)
  proposals stream last.
- ViewerBanner: a "use client" island that reads useSession() and renders the
  claim CTA / bookmark reminder / nothing. Render NOTHING while the session is
  loading, so logged-in users never see the "create account" CTA flash.
- REALTIME (the key risk): ThreadChat STAYS a "use client" leaf inside
  ProposalsSection. The server pre-fetches each proposal's initial messages and
  passes them as props; the client subscribes for live updates. Suspense does
  NOT govern the subscription — do not try to make the chat a server component or
  wrap the subscription in a server boundary. It mounts after ProposalsSection
  streams in; that deferred subscribe is fine.
- Skeletons: split loading.tsx into RequestHeaderSkeleton / RequestBodySkeleton /
  ProposalsSectionSkeleton (reuse its existing markup).

LANDMINES
- Keep /api/requests/[id] unless you confirm no other consumer (grep).
- No dynamic/revalidate/runtime. One file at a time. git status before commit.
- Don't break the anonymous (token-only) view — test logged-OUT with a token.

VERIFY
- pnpm build passes. Header streams first, proposals last; ThreadChat still
  receives realtime messages live (open two sessions to confirm). Anonymous
  token view works; logged-in owner sees claim/actions; no CTA flash.

FINISH — atomic commits, update AGENT_LOG/NOTES, push, DO NOT MERGE.
```

---

## PR 6 — provider request detail

Branch: `suspense/provider-request-detail` · Page: `/tiekejas/uzklausos/[id]`

```
[paslaugurinka.lt — same project/conventions.]

CONTEXT
The provider's request-detail page: metadata header -> description/client info ->
response section (form, copilot, unlock, existing response, thread chat). Strong
sequential reading order, so three boundaries that map to it. Foundation on main.

SETUP
  cd ~/Documents/Projects/marketplace-platform && git fetch origin
  git worktree add -b suspense/provider-request-detail ../mp-pr6 origin/main
  cd ../mp-pr6 && pnpm install

READ FIRST
1. AGENTS.md.
2. .../SUSPENSE_PLAN.md → Corrections, §Page 3 (full).
3. src/app/tiekejas/uzklausos/[id]/page.tsx + RequestDetailClient.tsx (443 lines)
   + its existing inline RequestDetailSkeleton (split into the three below).
4. src/components/auth/SessionGate.tsx; src/components/messaging/ThreadChat.tsx.

TASKS (§Page 3, requireRole="PROVIDER")
- Static back-link OUTSIDE the gate. Split RequestDetailClient into three async
  server sections: RequestHeader, RequestBody, ResponseSection — each in its own
  <Suspense>.
- All three read the SAME prisma.serviceRequest.findUnique({id}). This duplicate
  read is INTENTIONAL for streaming (pool handles parallel reads cheaply); ship
  it. Only if profiling later shows cost, hoist into a <RequestGate> — NOT now.
- Keep as "use client" leaves inside their sections: LeadCopilotCard, UnlockCard,
  the response form (AI-generate + submit), and ThreadChat (realtime — server
  pre-fetches initial messages, client subscribes). Forms/leaves receive
  server-fetched initial data as props so they hydrate with content visible.
- isLeadUnlocked() (raw SQL) stays inline in RequestBody. View tracking +
  read-status updates move into the section that owns those reads (fire-and-forget).
- Skeletons: RequestHeaderSkeleton / RequestBodySkeleton / ResponseSectionSkeleton
  from the current inline skeleton's three rows.

LANDMINES
- C2 if you touch any searchParams. Keep /api/tiekejas/uzklausos/[id] unless
  unused (grep). No dynamic/revalidate/runtime. One file at a time. git status
  before commit. Don't regress eligibility / unlock / accepted-response states.

VERIFY
- pnpm build passes. Header→body→response stream in order; copilot + unlock +
  AI-generate + submit + thread chat all still work; realtime still live;
  non-PROVIDER redirected.

FINISH — atomic commits, update AGENT_LOG/NOTES, push, DO NOT MERGE.
```

---

## PR 7 — provider dashboard (list + root) — HEAVIEST, ship last

Branch: `suspense/provider-dashboard` · Pages: `/tiekejas/uzklausos` (list), then `/tiekejas` (root)

```
[paslaugurinka.lt — same project/conventions.]

CONTEXT
The two highest-traffic provider pages. Do the LIST first (proves the filter
pattern), then the ROOT dashboard (an 878-line client component split into ~6
server sections). Highest UX impact; earlier PRs proved the pattern. Foundation
on main.

SETUP
  cd ~/Documents/Projects/marketplace-platform && git fetch origin
  git worktree add -b suspense/provider-dashboard ../mp-pr7 origin/main
  cd ../mp-pr7 && pnpm install

READ FIRST
1. AGENTS.md.
2. .../SUSPENSE_PLAN.md → Corrections (esp. C2 and C4), §Page 2 (uzklausos list),
   §Page 1 (root — read §A/§B/§C and C4 carefully).
3. src/app/tiekejas/uzklausos/page.tsx + RequestsListClient.tsx (558 lines) + the
   inline RequestsListSkeleton.
   src/app/tiekejas/page.tsx + ProviderDashboardClient.tsx (878 lines) +
   ProviderFollowUpsCard.tsx.
4. src/components/auth/SessionGate.tsx.

TASK A — /tiekejas/uzklausos list (§Page 2, requireRole="PROVIDER")
- Split RequestsListClient into: RequestsFilterShell ("use client", owns
  search/sort/filter state -> URL), sections/RequestsList (async server, awaits
  searchParams, does the query + semantic scoring + getUnlockedRequestIds),
  sections/CreditBadge (own small Suspense in the header), RequestCard (server).
- C2: NO key on the Suspense — RequestsList awaits the searchParams Promise
  internally. Ship the straightforward server version FIRST (skeleton matches
  layout, no jump); MEASURE; only layer optimistic client filtering later if
  users complain. Do NOT pre-build the optimistic path.
- Promote the inline RequestsListSkeleton to src/components/ui/skeletons/; add
  CreditBadgeSkeleton.

TASK B — /tiekejas root (§Page 1, requireRole="PROVIDER")
- Static <header> OUTSIDE the gate (per C1 — do NOT leave it inside the gate).
- Split ProviderDashboardClient into ~6 async server sections under
  src/app/tiekejas/sections/: AccountCard (bundles email-verif banner +
  suspension alert + pending-claim — one row), StatsGrid, ProfileCompletenessCard,
  RecentReviewsCard, FollowUpsCard (wraps the existing ProviderFollowUpsCard
  client leaf; server does the fetch so the LLM call happens during the stream).
  QuickLinksGrid is STATIC (sync, no Suspense).
- *** C4 — RESTRUCTURE ONLY, NO NEW FEATURES ***: §Page 1 §A lists "Recent
  matching requests" (item 9) and "Recent reviews" (item 10). VERIFIED: today the
  dashboard renders only a COUNT (stats.matchingRequests), no recent-leads list.
  Do NOT build a new recent-matching-requests list (or a recent-reviews list if
  it doesn't already render). Restructure only what renders today. Log any
  net-new section idea to NOTES.md as a separate feature follow-up.
- expandToMatchSet() is expensive and shared by StatsGrid; compute it once (at
  the gate level or a shared parent) and pass down — don't pay it twice.
- Each section gets its own <Suspense> + skeleton (AccountCardSkeleton,
  StatsGridSkeleton, ProfileCompletenessSkeleton, RecentReviewsSkeleton,
  FollowUpsSkeleton) in src/components/ui/skeletons/.
- Delete /api/tiekejas/stats ONLY after grepping for other consumers; otherwise
  keep it.

LANDMINES
- C2 (no searchParams in key). No dynamic/revalidate/runtime. No getServerSession
  in a layout (proxy.ts gates /tiekejas/*). Don't touch Header.tsx /
  MobileBottomNav (already Suspense-wrapped in layout). One file at a time.
  git status before commit. This is the biggest split — commit per section.

VERIFY
- pnpm build passes. List: filter changes feel responsive, no full-page blank.
  Root: header instant; account/stats/completeness/reviews/follow-ups each stream
  on their own boundary (throttle to SEE multi-stage fill-in — NOT one
  spinner→everything). non-PROVIDER redirected. All quick-links + story modal +
  follow-up actions still work.

FINISH — atomic commits (per section), update AGENT_LOG/NOTES, push, DO NOT MERGE.
Ship the LIST commit(s) before the ROOT commit(s) so review is incremental.
```
