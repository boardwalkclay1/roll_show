/* ============================================================
   ROLL SHOW — FULL APP SERVICE WORKER (FIXED)
   - Precaches all real pages under /public/pages/
   - HTML → network-first
   - Assets → cache-first
============================================================ */

const CACHE_NAME = "rollshow-full-v2";

const PRECACHE_URLS = [
  /* ROOT */
  "/",
  "/index.html",
  "/public/favicon.ico",
  "/manifest.webmanifest",
  "/service-worker.js",

  /* GLOBAL ASSETS */
  "/public/css/global.css",
  "/public/css/dashboard.css",
  "/public/js/api.js",
  "/public/js/app.js",

  /* OWNER PAGES */
  "/public/pages/owner/owner-dashboard.html",
  "/public/pages/owner/users.html",
  "/public/pages/owner/skaters.html",
  "/public/pages/owner/businesses.html",
  "/public/pages/owner/musicians.html",
  "/public/pages/owner/shows.html",
  "/public/pages/owner/contracts.html",
  "/public/pages/owner/music.html",
  "/public/pages/owner/business-application.html",
  "/public/pages/owner/owner-verifications.html",
  "/public/pages/owner/owner-payout.html",
  "/public/pages/owner/owner-analytics.html",
  "/public/pages/owner/settings.html",

  /* BUSINESS PAGES */
  "/public/pages/business/dashboard.html",
  "/public/pages/business/offers.html",
  "/public/pages/business/contracts.html",
  "/public/pages/business/create-offer.html",
  "/public/pages/business/offers-inbox.html",
  "/public/pages/business/branding-studio.html",
  "/public/pages/business/business-feed.html",
  "/public/pages/business/apply.html",

  /* BUYER PAGES */
  "/public/pages/buyer/dashboard.html",
  "/public/pages/buyer/tickets.html",
  "/public/pages/buyer/purchase-history.html",
  "/public/pages/buyer/buyer-feed.html",
  "/public/pages/buyer/ticket-wallet.html",
  "/public/pages/buyer/ticket-confirmation.html",
  "/public/pages/buyer/ticket-view.html",
  "/public/pages/buyer/buyer-profile.html",

  /* SKATER PAGES */
  "/public/pages/skater/dashboard.html",
  "/public/pages/skater/skater-profile.html",
  "/public/pages/skater/shows.html",
  "/public/pages/skater/create-show.html",
  "/public/pages/skater/lessons.html",
  "/public/pages/skater/lesson-requests.html",
  "/public/pages/skater/skater-feed.html",
  "/public/pages/skater/branding-studio.html",
  "/public/pages/skater/music-library.html",
  "/public/pages/skater/businesses.html",

  /* MUSICIAN PAGES */
  "/public/pages/musician/dashboard.html",
  "/public/pages/musician/profile.html",
  "/public/pages/musician/tracks.html",
  "/public/pages/musician/licenses.html",
  "/public/pages/musician/upload-track.html",
  "/public/pages/musician/musician-feed.html",
  "/public/pages/musician/branding-studio.html",
  "/public/pages/musician/music-library.html",

  /* SYSTEM PAGES */
  "/public/pages/system/messages.html",
  "/public/pages/system/notifications.html",
  "/public/pages/system/search.html",
  "/public/pages/system/map.html",
  "/public/pages/system/qr.html",
  "/public/pages/system/settings.html",

  /* BACKGROUNDS */
  "/public/images/backs/roll-show-gold.jpg",
  "/public/images/backs/Roll-music.jpg",
  "/public/images/backs/Roll-business.jpg",
  "/public/images/backs/Roll-buyer.jpg",
  "/public/images/backs/Roll-owner.jpg",
  "/public/images/bg-artist-dash.jpg",
  "/public/images/bg-buyer-dash.jpg",
  "/public/images/bg-skater-dash.jpg",
  "/public/images/bg-business-dash.jpg",

  /* ICONS */
  "/public/images/favicon.png",
  "/public/images/icons/icon-192.png",
  "/public/images/icons/icon-512.png",

  /* LOGOS */
  "/public/images/logo.png",
  "/public/images/logo-white.png",
  "/public/images/logo-gold.png"
];

/* INSTALL */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

/* ACTIVATE */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

/* FETCH */
self.addEventListener("fetch", event => {
  const req = event.request;
  const accept = req.headers.get("accept") || "";

  // HTML → network-first
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

  // Assets → cache-first
  event.respondWith(
    caches.match(req).then(cached => {
      const fetchPromise = fetch(req)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          return res;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});
