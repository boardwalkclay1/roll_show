const CACHE_NAME = "rollshow-cache-v1";

const ASSETS = [
  "/",
  "/index.html",
  "/login.html",
  "/app/styles/styles.css",
  "/js/app.js",
  "/images/roll-show.jpg",
  "/manifest.webmanifest"
];

// INSTALL
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// FETCH
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      return (
        cached ||
        fetch(event.request).catch(() => caches.match("/index.html"))
      );
    })
  );
});
