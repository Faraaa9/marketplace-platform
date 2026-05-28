import { revalidateTag } from "next/cache";

// Centralized cache-tag busting. The tag -> surface mapping is the non-obvious
// part: each cached reader picks its own tags, so a mutation must hit EVERY tag
// that renders the changed data or the bust is a silent no-op. Keep this list in
// sync with the cacheTag() calls in page.tsx, /meistrai/[slug], providers-listing.

// Surfaces that render a provider's public listing or profile page. Call after
// any mutation to provider-visible data (profile edit, active toggle, profile
// moderation). Pass the provider user id to also bust that provider's
// page-specific tag; omit it when the caller only has the profile id.
export function revalidateProviderCaches(providerUserId?: string) {
  revalidateTag("providers", { expire: 0 }); // homepage + /meistrai/[slug] hero
  revalidateTag("providers-listing", { expire: 0 }); // /meistrai list
  revalidateTag("home-data", { expire: 0 }); // homepage featured block
  if (providerUserId) {
    revalidateTag(`provider:user:${providerUserId}`, { expire: 0 });
  }
}

// Review visibility changed (admin approve/reject). Ratings + counts also show
// on provider cards/listings, so this refreshes provider surfaces too.
export function revalidateReviewCaches(providerUserId?: string) {
  revalidateTag("reviews", { expire: 0 });
  if (providerUserId) {
    revalidateTag(`reviews:user:${providerUserId}`, { expire: 0 });
  }
  revalidateProviderCaches(providerUserId);
}
