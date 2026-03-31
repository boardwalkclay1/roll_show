/* ============================================================
   ROLL SHOW — SERVICE WORKER (AUTO-UPDATING)
   No HTML caching. No stale CSS/JS. No manual version bumps.
============================================================ */

const CACHE_NAME = "rollshow-static-v1";

/* ============================================================
   INSTALL — Cache ALL static assets under /app/
============================================================ */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const base = "/app/";
      const assets = [
        // Core
        "/",
        "/manifest.webmanifest",

        // Styles
        "/app/styles/styles.css",
        "/app/styles/dashboard.css",

        // Global JS
        "/app/js/app.js",

        // Images (backgrounds, icons, etc.)
        "/app/images/bg-artist-dash.jpg",
        "/app/images/bg-buyer-dash.jpg",
        "/app/images/bg-skater-dash.jpg",
        "/app/images/bg-business-dash.jpg",
        "/app/images/icons/icon-192.png",
        "/app/images/icons/icon-512.png"
      ];

      await cache.addAll(assets);
    })
  );
  self.skipWaiting();
});

/* ============================================================
   ACTIVATE — Clear old caches
============================================================ */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* ============================================================
   FETCH STRATEGY
   - HTML → ALWAYS network (never cached)
   - CSS/JS/Images → cache-first
============================================================ */
self.addEventListener("fetch", event => {
  const req = event.request;

  // HTML → network only (auto-updates always)
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(fetch(req).catch(() => caches.match("/index.html")));
    return;
  }

  // Static assets → cache-first
  if (
    req.url.includes("/app/") &&
    (req.url.endsWith(".css") ||
     req.url.endsWith(".js") ||
     req.url.endsWith(".png") ||
     req.url.endsWith(".jpg") ||
     req.url.endsWith(".jpeg") ||
     req.url.endsWith(".webp") ||
     req.url.endsWith(".gif") ||
     req.url.endsWith(".svg"))
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        return (
          cached ||
          fetch(req).then(res => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
            return res;
          })
        );
      })
    );
    return;
  }

  // Default → network fallback to cache
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
