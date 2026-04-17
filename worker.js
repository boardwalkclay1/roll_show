// rollshow-worker.js — CLEAN, STATIC-SAFE, API-ONLY

import { cors, apiJson } from "./users.js";
import { listTickets, createTicket, partnerWebhook, checkInTicket, buyerDashboard } from "./buyers.js";
import { makeSkatersApi } from "./skaters.js";
import {
  businessDashboard, businessSubmitOffer, businessSubmitEvent, businessSubmitAd,
  businessSubmitVenue, businessSubmitSponsorship, businessSubmitAffiliate,
  businessSubmitDiscount, businessAddStaff, businessRemoveStaff,
  businessListStaff, businessScanTicket, createBusinessProfile
} from "./business.js";
import { musicianDashboard, uploadTrack, listMusic, licenseTrack, createMusicianProfile } from "./musicians.js";

// ❌ REMOVED — THIS WAS THE PROBLEM
// import { ownerDashboard } from "./routes/owner.js";

// ------------------------------------------------------------
// UTILITIES
// ------------------------------------------------------------
function withCORS(res) {
  const headers = cors();
  for (const [k, v] of Object.entries(headers)) res.headers.set(k, v);
  return res;
}

function normalize(path) {
  if (!path) return "/";
  return path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;
}

// ------------------------------------------------------------
// WORKER ENTRYPOINT — STATIC SAFE
// ------------------------------------------------------------
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalize(url.pathname);
    const method = request.method.toUpperCase();

    // OPTIONS
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    // ------------------------------------------------------------
    // STATIC FILES — LET CLOUDFLARE PAGES HANDLE THEM
    // ------------------------------------------------------------
    if (
      path.startsWith("/pages/") ||
      path.startsWith("/app/") ||
      path.startsWith("/assets/") ||
      path.endsWith(".html") ||
      path.endsWith(".css") ||
      path.endsWith(".js")
    ) {
      return env.ASSETS.fetch(request);
    }

    try {
      const Skaters = makeSkatersApi(env.DB_roll);

      // ------------------------------------------------------------
      // SKATER API
      // ------------------------------------------------------------
      if (path === "/api/profiles/skater" && method === "POST")
        return withCORS(await Skaters.createSkaterProfile(request, env, {}));

      if (path === "/api/skater/dashboard" && method === "GET")
        return withCORS(await Skaters.skaterDashboard(request, env, {}));

      // ------------------------------------------------------------
      // MUSICIAN API
      // ------------------------------------------------------------
      if (path === "/api/profiles/musician" && method === "POST")
        return withCORS(await createMusicianProfile(request, env, {}));

      if (path === "/api/musician/dashboard" && method === "GET")
        return withCORS(await musicianDashboard(request, env, {}));

      if (path === "/api/musician/tracks" && method === "GET")
        return withCORS(await listMusic(request, env, {}));

      if (path === "/api/musician/tracks" && method === "POST")
        return withCORS(await uploadTrack(request, env, {}));

      if (path === "/api/musician/license" && method === "POST")
        return withCORS(await licenseTrack(request, env, {}));

      // ------------------------------------------------------------
      // BUSINESS API
      // ------------------------------------------------------------
      if (path === "/api/profiles/business" && method === "POST")
        return withCORS(await createBusinessProfile(request, env, {}));

      if (path === "/api/business/dashboard" && method === "GET")
        return withCORS(await businessDashboard(request, env, {}));

      if (path === "/api/business/offers" && method === "POST")
        return withCORS(await businessSubmitOffer(request, env, {}));

      if (path === "/api/business/events" && method === "POST")
        return withCORS(await businessSubmitEvent(request, env, {}));

      if (path === "/api/business/ads" && method === "POST")
        return withCORS(await businessSubmitAd(request, env, {}));

      if (path === "/api/business/venues" && method === "POST")
        return withCORS(await businessSubmitVenue(request, env, {}));

      if (path === "/api/business/sponsorships" && method === "POST")
        return withCORS(await businessSubmitSponsorship(request, env, {}));

      if (path === "/api/business/affiliates" && method === "POST")
        return withCORS(await businessSubmitAffiliate(request, env, {}));

      if (path === "/api/business/discounts" && method === "POST")
        return withCORS(await businessSubmitDiscount(request, env, {}));

      if (path === "/api/business/staff" && method === "POST")
        return withCORS(await businessAddStaff(request, env, {}));

      if (path === "/api/business/staff" && method === "DELETE")
        return withCORS(await businessRemoveStaff(request, env, {}));

      if (path === "/api/business/staff" && method === "GET")
        return withCORS(await businessListStaff(request, env, {}));

      if (path === "/api/business/scan-ticket" && method === "POST")
        return withCORS(await businessScanTicket(request, env, {}));

      // ------------------------------------------------------------
      // BUYER API
      // ------------------------------------------------------------
      if (path === "/api/buyer/dashboard" && method === "GET")
        return withCORS(await buyerDashboard(request, env, {}));

      if (path === "/api/buyer/tickets" && method === "GET")
        return withCORS(await listTickets(request, env, {}));

      if (path === "/api/buyer/tickets" && method === "POST")
        return withCORS(await createTicket(request, env, {}));

      if (path === "/api/buyer/partner-webhook" && method === "POST")
        return withCORS(await partnerWebhook(request, env));

      if (path === "/api/buyer/checkin" && method === "POST")
        return withCORS(await checkInTicket(request, env, {}));

      // ------------------------------------------------------------
      // LEGAL
      // ------------------------------------------------------------
      if (path === "/api/legal/accept" && method === "POST")
        return withCORS(apiJson({ success: true }));

      // ------------------------------------------------------------
      // FALLBACK
      // ------------------------------------------------------------
      return withCORS(apiJson({ success: false, message: "Not found" }, 404));

    } catch (err) {
      return withCORS(apiJson({ success: false, message: "Server error", detail: String(err) }, 500));
    }
  }
};
