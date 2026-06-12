/* PaslaugųRinka service worker */
const CACHE_NAME = "paslaugurinka-v2";
const PRECACHE_URLS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Skip API, Next.js data routes and JS/CSS chunks. Next chunks are already
  // content-hashed in production, and caching dev chunks can serve stale module
  // factories after Turbopack/HMR updates.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/data/") ||
    url.pathname.startsWith("/_next/static/")
  ) {
    return;
  }

  // Stale-while-revalidate for app-owned static assets, icons, fonts
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/fonts/")
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetchPromise = fetch(req)
          .then((resp) => {
            if (resp && resp.ok) {
              const clone = resp.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
            }
            return resp;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Network-first for HTML pages with offline fallback to "/"
  event.respondWith(
    fetch(req).catch(() =>
      caches.match(req).then((cached) => cached || caches.match("/"))
    )
  );
});
