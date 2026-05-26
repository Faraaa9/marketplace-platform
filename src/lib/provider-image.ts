export type ProviderImageSource = {
  image?: string | null;
  providerProfile?: {
    images?: string[] | null;
    heroImageUrl?: string | null;
  } | null;
};

export function getProviderAvatarImage(provider: ProviderImageSource | null | undefined) {
  if (!provider) return null;
  return provider.providerProfile?.images?.[0] || provider.providerProfile?.heroImageUrl || provider.image || null;
}
