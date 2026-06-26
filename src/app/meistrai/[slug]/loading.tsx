import ProfileSkeletonV2 from "./components/ProfileSkeletonV2";

// Route-level fallback shown on navigation into a profile. Same skeleton as the
// page's Suspense fallback so hard loads and client-side nav look identical.
export default function ProviderProfileLoading() {
  return <ProfileSkeletonV2 />;
}
