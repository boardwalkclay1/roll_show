/* ============================================================
   ROLL SHOW — AUTO-UPDATING SERVICE WORKER (FIXED)
   - HTML → network-first
   - JS/CSS → network-first
   - Images → cache-first
   - NEVER caches POST/PUT/PATCH/DELETE
   - No precache list
============================================================ */

const CACHE_NAME = "rollshow-dynamic-cache";

/* INSTALL */
self.addEventListener("install", event => {
  self.skipWaiting();
});

/* ACTIVATE */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* FETCH */
self.addEventListener("fetch", event => {
  const req = event.request;
  const method = req.method;
  const accept = req.headers.get("accept") || "";

  /* 🚫 NEVER CACHE NON-GET REQUESTS */
  if (method !== "GET") {
    event.respondWith(fetch(req));
    return;
  }

  /* HTML → network-first */
  if (req.mode === "navigate" || accept.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  /* JS/CSS → network-first */
  if (req.url.endsWith(".js") || req.url.endsWith(".css")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  /* Images → cache-first */
  if (req.url.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/i)) {
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

  /* Default GET → network-first */
  event.respondWith(
    fetch(req)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
        return res;
      })
      .catch(() => caches.match(req))
  );
});
