# Known Warnings

This file tracks non-blocking warnings that are currently accepted but should
remain visible for future cleanup. Do not add secrets, raw user content, or full
provider/client payloads here.

Last checked: 2026-05-27.

## Prisma Generate

Command:

```bash
npx prisma generate
```

Status: passes.

Known warnings:

- `package.json#prisma` configuration property is deprecated and will be
  removed in Prisma 7.
- `prisma.config.ts` overrides the deprecated `package.json#prisma` property.

Observed messages:

```text
warn The configuration property `package.json#prisma` is deprecated and will be removed in Prisma 7. Please migrate to a Prisma config file (e.g., `prisma.config.ts`).
For more information, see: https://pris.ly/prisma-config

warn The Prisma config file in prisma.config.ts overrides the deprecated `package.json#prisma` property in package.json.
  For more information, see: https://pris.ly/prisma-config
```

Notes:

- Both warnings appear together: the second is a direct consequence of the
  first (the new `prisma.config.ts` shadows the old `package.json#prisma`
  block).
- Likely cleanup path: remove the `prisma` block from `package.json` so only
  `prisma.config.ts` remains as the source of truth. Verify the existing
  config in `prisma.config.ts` already covers everything `package.json#prisma`
  declared before deleting.

## Build

Command:

```bash
npm run build
```

Status: passes.

Known warning:

- `ExperimentalWarning`: Tailwind CSS loads `tailwind.config.ts` through a
  CommonJS `require()` path during `next build`.

Observed message:

```text
CommonJS module node_modules/tailwindcss/lib/lib/load-config.js is loading ES Module tailwind.config.ts using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
```

Notes:

- This is separate from the old Upstash rate-limit warning. The Upstash warning
  was fixed so it no longer appears during production build.
- Likely cleanup path: migrate Tailwind config loading to a setup that does not
  require an ESM TypeScript config through Tailwind's CommonJS loader, or verify
  whether the current Tailwind/Next versions have an official migration path.

## Lint

Command:

```bash
npm run lint
```

Status: passes with `0 errors, 31 warnings`.

Known warning groups:

- Unused `eslint-disable` comments for `react-hooks/set-state-in-effect`.
- Unused `eslint-disable` comments with no reported rule.
- Two unused variables in `src/app/api/requests/[id]/route.ts`.
- Two missing `persistDraft` dependencies in
  `src/app/uzklausos/nauja/page.tsx`.

Current files with warnings:

- `src/app/admin/claims/page.tsx`
- `src/app/admin/laiskai/page.tsx`
- `src/app/admin/moderacija/page.tsx`
- `src/app/admin/nustatymai/CreditPacksCard.tsx`
- `src/app/admin/tiekejai/page.tsx`
- `src/app/api/requests/[id]/route.ts`
- `src/app/kontaktai/AIProfileSetup.tsx`
- `src/app/meistrai/[slug]/components/DirectInquiryWidget.tsx`
- `src/app/tiekejas/page.tsx`
- `src/app/tiekejas/uzklausos/[id]/page.tsx`
- `src/app/tiekejas/uzklausos/page.tsx`
- `src/app/tiekejas/zinutes/[id]/page.tsx`
- `src/app/uzklausos/nauja/page.tsx`
- `src/app/uzklausos/sekti/[id]/page.tsx`
- `src/app/zinutes/[token]/page.tsx`
- `src/components/marketing/HeroSearch.tsx`
- `src/components/stories/MultiStoryViewer.tsx`
- `src/components/tiekejai/ProviderListingClient.tsx`

Cleanup order:

1. Remove unused `eslint-disable` comments that are no longer suppressing
   anything.
2. Fix the unused `images` and `heroImageUrl` destructuring in
   `src/app/api/requests/[id]/route.ts`.
3. Review `persistDraft` in `src/app/uzklausos/nauja/page.tsx` and either make
   it stable with `useCallback` or intentionally restructure the effects.

## Local Tooling

Command:

```bash
npx tsc --noEmit --pretty false
```

Status: passes.

Known warning on the current local Node/npm toolchain:

- `ExperimentalWarning`: npm's bundled `debug` package loads
  `supports-color` through a CommonJS `require()` path under Node `v23.1.0`.

Observed message:

```text
CommonJS module .../node_modules/npm/node_modules/debug/src/node.js is loading ES Module .../node_modules/npm/node_modules/supports-color/index.js using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
```

Notes:

- This comes from the local npm/Node toolchain, not from application code.
- Likely cleanup path: use the project-pinned Node LTS version in local and CI
  once it is formalized, or update npm/Node when the warning is resolved
  upstream.
