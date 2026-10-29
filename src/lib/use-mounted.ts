import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * False during SSR and hydration, true afterwards. Gate session-dependent UI
 * on it: a client island inside a late-streaming Suspense boundary can hydrate
 * after next-auth already resolved the session, so rendering by `status`
 * directly would differ from the server HTML (which always saw "loading").
 */
export function useMounted(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}
