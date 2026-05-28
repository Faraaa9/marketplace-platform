/**
 * Shared skeleton library — the single home for Suspense fallback shapes.
 *
 * Convention:
 * - Compose every skeleton from the primitives in `@/components/ui/Skeleton`:
 *   `Skeleton` (default export) and `SkeletonCard` (named export). Don't
 *   hand-roll pulsing divs — reuse the primitives so the look stays uniform.
 * - One file per shape (e.g. `ConversationListSkeleton.tsx`), re-exported here.
 * - Each later PR adds only the skeletons its own pages need and re-exports
 *   them from this barrel.
 * - A skeleton MUST mirror its page's real layout so nothing shifts (no CLS)
 *   when data streams in. Build and verify each shape against the live layout
 *   — never pre-build page-specific skeletons speculatively.
 *
 * This PR establishes the home + convention only; pages add their shapes here.
 */
export { default as InquiriesListSkeleton } from "./InquiriesListSkeleton";
export { default as MyRequestsListSkeleton } from "./MyRequestsListSkeleton";
