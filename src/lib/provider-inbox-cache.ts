type ProviderInboxCacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const providerInboxListCache = new Map<string, ProviderInboxCacheEntry<unknown>>();

export function getProviderInboxCache<T>(key: string): T | null {
  const cached = providerInboxListCache.get(key);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    providerInboxListCache.delete(key);
    return null;
  }
  return cached.data as T;
}

export function setProviderInboxCache<T>(key: string, data: T, ttlMs: number) {
  providerInboxListCache.set(key, {
    expiresAt: Date.now() + ttlMs,
    data,
  });
}

export function invalidateProviderInboxListCache(providerId: string) {
  for (const key of providerInboxListCache.keys()) {
    if (key.startsWith(`${providerId}:`)) {
      providerInboxListCache.delete(key);
    }
  }
}
