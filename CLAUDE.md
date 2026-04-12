Platform: paslaugurinka.lt | Service Marketplace MVP

Stack: Next.js 14+ (App Router), TS, Tailwind, Prisma, Zustand, Cloudinary

Principai: MVP first, clean code, mobile-first, no overengineering

Performance Goal: Axiom-grade responsiveness (<100ms interaction latency)

🚀 Performance Philosophy (Axiom-Fast)

Zero-Latency Intent: Every UI interaction (toggles, filters, tabs) must feel local.

State Split: Use Zustand for volatile UI state (filters, story viewer, modals). Use Server Components/Prisma for core data.

Hydration Hygiene: Keep the initial JS bundle lean. Defer non-critical animations.

🏗️ Technical Architecture

Next.js: Always favor Server Components. Use 'use client' only for interactive leaf components ("Islands").

Data Fetching: - Public pages: Fetch via Prisma in RSC.

Interactive lists: Implement Local-First filtering. Fetch data once in RSC, filter in-memory via Zustand to eliminate network lag on category/location changes.

Images: Use next/image + optimizeCloudinaryUrl().

No raw <img> tags allowed.

Apply priority attribute to the first 2 images of any listing (LCP optimization).

Search: Keep text-based search debounced to minimize database load.

🛠️ Component & State Rules

Islands Architecture: Wrap interactive sections (stories, maps, forms) in small, isolated client components.

Loading Patterns: Use Suspense with skeleton loaders for secondary data (reviews, similar providers) to enable streaming.

Re-render Control: Use Zustand shallow selectors (e.g., useStore(state => state.value)) to prevent unnecessary component updates.

MagicUI / Animations: Lazy-load particles and heavy tickers using next/dynamic with { ssr: false }.

✅ Development Checklist

Build Check: Run npm run build after major changes to catch hydration or type errors.

Env Variables: If missing, use a placeholder and mark with // TODO: ENV.

Performance Check: 1. Can this be a Server Component?
2. Is the user seeing a spinner for more than 500ms? (If so, use Optimistic UI).
3. Are images being served as WebP/AVIF via Cloudinary?