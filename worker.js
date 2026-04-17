import { cors, apiJson } from "./users.js";

import {
  listTickets,
  createTicket,
  partnerWebhook,
  checkInTicket,
  buyerDashboard
} from "./buyers.js";

import { makeSkatersApi } from "./skaters.js";

import {
  businessDashboard,
  businessSubmitOffer,
  businessSubmitEvent,
  businessSubmitAd,
  businessSubmitVenue,
  businessSubmitSponsorship,
  businessSubmitAffiliate,
  businessSubmitDiscount,
  businessAddStaff,
  businessRemoveStaff,
  businessListStaff,
  businessScanTicket,
  createBusinessProfile
} from "./business.js";

import {
  musicianDashboard,
  uploadTrack,
  listMusic,
  licenseTrack,
  createMusicianProfile
} from "./musicians.js";

import { ownerDashboard } from "./routes/owner.js";

/* ------------------------------------------------------------
   UTILITIES
------------------------------------------------------------ */
function withCORS(response) {
  const headers = cors();
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v);
  }
  return response;
}

function normalizePath(path) {
  if (!path) return "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

/* ------------------------------------------------------------
   WORKER ENTRYPOINT — NO AUTH, NO ROLES
------------------------------------------------------------ */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = normalizePath(url.pathname);
    const method = (request.method || "GET").toUpperCase();

    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    try {
      const Skaters = makeSkatersApi ? makeSkatersApi(env.DB_roll) : {};

      /* SKATER ROUTES */
      if (path === "/api/profiles/skater" && method === "POST") {
        return withCORS(await Skaters.createSkaterProfile(request, env, {}));
      }

      if (path === "/api/skater/dashboard" && method === "GET") {
        return withCORS(await Skaters.skaterDashboard(request, env, {}));
      }

      /* MUSICIAN ROUTES */
      if (path === "/api/profiles/musician" && method === "POST") {
        return withCORS(await createMusicianProfile(request, env, {}));
      }

      if (path === "/api/musician/dashboard" && method === "GET") {
        return withCORS(await musicianDashboard(request, env, {}));
      }

      if (path === "/api/musician/tracks" && method === "GET") {
        return withCORS(await listMusic(request, env, {}));
      }

      if (path === "/api/musician/tracks" && method === "POST") {
        return withCORS(await uploadTrack(request, env, {}));
      }

      if (path === "/api/musician/license" && method === "POST") {
        return withCORS(await licenseTrack(request, env, {}));
      }

      /* BUSINESS ROUTES */
      if (path === "/api/profiles/business" && method === "POST") {
        return withCORS(await createBusinessProfile(request, env, {}));
      }

      if (path === "/api/business/dashboard" && method === "GET") {
        return withCORS(await businessDashboard(request, env, {}));
      }

      if (path === "/api/business/offers" && method === "POST") {
        return withCORS(await businessSubmitOffer(request, env, {}));
      }

      if (path === "/api/business/events" && method === "POST") {
        return withCORS(await businessSubmitEvent(request, env, {}));
      }

      if (path === "/api/business/ads" && method === "POST") {
        return withCORS(await businessSubmitAd(request, env, {}));
      }

      if (path === "/api/business/venues" && method === "POST") {
        return withCORS(await businessSubmitVenue(request, env, {}));
      }

      if (path === "/api/business/sponsorships" && method === "POST") {
        return withCORS(await businessSubmitSponsorship(request, env, {}));
      }

      if (path === "/api/business/affiliates" && method === "POST") {
        return withCORS(await businessSubmitAffiliate(request, env, {}));
      }

      if (path === "/api/business/discounts" && method === "POST") {
        return withCORS(await businessSubmitDiscount(request, env, {}));
      }

      if (path === "/api/business/staff" && method === "POST") {
        return withCORS(await businessAddStaff(request, env, {}));
      }

      if (path === "/api/business/staff" && method === "DELETE") {
        return withCORS(await businessRemoveStaff(request, env, {}));
      }

      if (path === "/api/business/staff" && method === "GET") {
        return withCORS(await businessListStaff(request, env, {}));
      }

      if (path === "/api/business/scan-ticket" && method === "POST") {
        return withCORS(await businessScanTicket(request, env, {}));
      }

      /* BUYER ROUTES */
      if (path === "/api/buyer/dashboard" && method === "GET") {
        return withCORS(await buyerDashboard(request, env, {}));
      }

      if (path === "/api/buyer/tickets" && method === "GET") {
        return withCORS(await listTickets(request, env, {}));
      }

      if (path === "/api/buyer/tickets" && method === "POST") {
        return withCORS(await createTicket(request, env, {}));
      }

      if (path === "/api/buyer/partner-webhook" && method === "POST") {
        return withCORS(await partnerWebhook(request, env));
      }

      if (path === "/api/buyer/checkin" && method === "POST") {
        return withCORS(await checkInTicket(request, env, {}));
      }

      /* OWNER ROUTES */
      if (path === "/api/owner/dashboard" && method === "GET") {
        return withCORS(await ownerDashboard(request, env, {}));
      }

      /* OWNER SETTINGS — MATCH owner-dashboard.js CALLS */
      if (path === "/api/owner/settings/branding" && method === "GET") {
        return withCORS(apiJson({ success: true, branding: {} }));
      }

      if (path === "/api/owner/settings/notes" && method === "GET") {
        return withCORS(apiJson({ success: true, notes: [] }));
      }

      if (path === "/api/owner/ads" && method === "GET") {
        return withCORS(apiJson({ success: true, ads: [] }));
      }

      if (path === "/api/owner/sponsorships" && method === "GET") {
        return withCORS(apiJson({ success: true, sponsorships: [] }));
      }

      /* LEGAL ACCEPTANCE */
      if (path === "/api/legal/accept" && method === "POST") {
        return withCORS(apiJson({ success: true }));
      }

      /* FALLBACK */
      return withCORS(apiJson({ success: false, message: "Not found" }, 404));

    } catch (err) {
      console.error("Worker fetch error:", String(err));
      return withCORS(apiJson({ success: false, message: "Server error", detail: String(err) }, 500));
    }
  }
};
