/* ============================================================
   ROLL SHOW — SERVICE WORKER v1
   Clean, modern, no stale CSS, no stale HTML
============================================================ */

const CACHE_VERSION = "rollshow-v1";
const STATIC_CACHE = `${CACHE_VERSION}-static`;

/* ============================================================
   STATIC ASSETS TO CACHE
============================================================ */
const STATIC_ASSETS = [
  "/", 
  "/index.html",

  /* GLOBAL */
  "/app/styles/styles.css",
  "/app/js/app.js",

  /* ICONS */
  "/app/images/icons/icon-192.png",
  "/app/images/icons/icon-512.png",

  /* MANIFEST */
  "/manifest.webmanifest"
];

/* ============================================================
   INSTALL — Cache static assets
============================================================ */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

/* ============================================================
   ACTIVATE — Remove old caches
============================================================ */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

/* ============================================================
   FETCH STRATEGY
   - HTML → network-first (so updates always load)
   - CSS/JS/Images → cache-first
============================================================ */
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);

  // HTML → always try network first
  if (req.mode === "navigate" || req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(STATIC_CACHE).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req).then(cached => cached || caches.match("/index.html")))
    );
    return;
  }

  // Static assets → cache-first
  if (
    req.url.endsWith(".css") ||
    req.url.endsWith(".js") ||
    req.url.endsWith(".png") ||
    req.url.endsWith(".jpg") ||
    req.url.endsWith(".jpeg") ||
    req.url.endsWith(".webp") ||
    req.url.endsWith(".gif") ||
    req.url.endsWith(".svg")
  ) {
    event.respondWith(
      caches.match(req).then(cached => {
        return (
          cached ||
          fetch(req).then(res => {
            const clone = res.clone();
            caches.open(STATIC_CACHE).then(cache => cache.put(req, clone));
            return res;
          })
        );
      })
    );
    return;
  }

  // Default → network fallback to cache
  event.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
