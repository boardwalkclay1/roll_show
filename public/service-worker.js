const CACHE_NAME = "rollshow-cache-v5";

/* STATIC ASSETS (HTML, CSS, JS, MANIFEST, ICONS) */
const STATIC_ASSETS = [
  "/",
  "/index.html",

  /* AUTH */
  "/pages/auth-login.html",

  /* SIGNUP */
  "/pages/signup-buyer.html",
  "/pages/signup-skater.html",
  "/pages/signup-business.html",

  /* BUYER */
  "/pages/buyer-profile.html",
  "/pages/ticket-wallet.html",
  "/pages/purchase-history.html",
  "/pages/ticket-confirmation.html",
  "/pages/ticket.view.html",

  /* SKATER */
  "/pages/skater-dashboard.html",
  "/pages/create-show.html",
  "/pages/video-studio.html",
  "/pages/branding-studio.html",
  "/pages/skater-profile-edit.html",
  "/pages/skater-royalties.html",

  /* BUSINESS */
  "/pages/business-dashboard.html",

  /* PUBLIC */
  "/pages/show.html",
  "/pages/skaters-feed.html",

  /* CONTRACTS */
  "/pages/contracts.html",

  /* MUSIC */
  "/pages/music-upload.html",
  "/pages/music-library.html",

  /* LEGAL */
  "/pages/terms.html",
  "/pages/privacy.html",
  "/pages/legal.html",

  /* CORE FILES */
  "/app/styles/styles.css",
  "/app/js/app.js",

  /* ICONS */
  "/app/images/icons/icon-192.png",
  "/app/images/icons/icon-512.png",

  /* MANIFEST */
  "/manifest.webmanifest"
];

/* INSTALL */
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      // Cache static assets
      await cache.addAll(STATIC_ASSETS);

      // Dynamically cache ALL images in /app/images/ including subfolders
      const imageList = await fetch("/app/images/")
        .then(res => res.text())
        .then(html => {
          const matches = [...html.matchAll(/href="([^"]+\.(jpg|png|jpeg|webp|gif))"/g)];
          return matches.map(m => "/app/images/" + m[1]);
        })
        .catch(() => []);

      for (const img of imageList) {
        try {
          await cache.add(img);
        } catch (e) {
          // ignore missing files
        }
      }
    })
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
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => caches.match("/index.html"));
    })
  );
});
