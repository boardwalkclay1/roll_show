// ROLL SHOW — ZERO CACHE, AUTO UPDATE, NO INTERFERENCE

// INSTALL — activate immediately
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

// ACTIVATE — wipe ALL old caches + take control
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// FETCH — network only, no cache, no API interception
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // 1. Never touch API calls
  if (url.pathname.startsWith("/api/")) {
    return; // let browser hit Worker directly
  }

  // 2. Never touch auth, login, signup, dashboards
  if (url.pathname.includes("auth") || url.pathname.includes("dashboard")) {
    return;
  }

  // 3. Always fetch from network, no caching
  event.respondWith(fetch(req));
});
