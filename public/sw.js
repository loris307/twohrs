// Minimal service worker for PWA installability.
// twohrs is an online-only app (time-limited, daily content reset),
// so offline caching is intentionally not implemented.

const CACHE_NAME = "twohrs-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", () => {
  // Network-only: all requests go through the normal network path.
  return;
});
