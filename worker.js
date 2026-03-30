import { cors, json } from "./utils.js";
import { login, requireRole } from "./users.js";

import {
  signupBuyer,
  listTickets,
  listPurchases,
  createTicket,
  partnerWebhook
} from "./buyers.js";

import {
  signupSkater,
  listShows,
  getShow,
  skaterDashboard,
  listSkaterShows,
  createShow,
  updateSkaterProfile
} from "./skaters.js";

import {
  signupBusiness,
  businessDashboard,
  createOffer,
  listBusinessOffers,
  createContract,
  listContracts
} from "./business.js";

import {
  signupMusician,
  musicianDashboard,
  uploadTrack,
  listMusic,
  licenseTrack
} from "./musicians.js";

import {
  ownerOverview,
  ownerUsers,
  ownerSkaters,
  ownerBusinesses,
  ownerMusicians,
  ownerShows,
  ownerContracts,
  ownerMusic,
  ownerSettingsBranding,
  ownerSettingsNotes
} from "./routes/owner.js";

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // CORS
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors() });
      }

      /* ============================================================
         AUTH
      ============================================================ */
      if (path === "/api/login" && request.method === "POST") {
        return login(request, env);
      }

      /* ============================================================
         SIGNUP ROUTES
      ============================================================ */
      if (path === "/api/buyer/signup" && request.method === "POST") {
        return signupBuyer(request, env);
      }
      if (path === "/api/skater/signup" && request.method === "POST") {
        return signupSkater(request, env);
      }
      if (path === "/api/musician/signup" && request.method === "POST") {
        return signupMusician(request, env);
      }
      if (path === "/api/business/signup" && request.method === "POST") {
        return signupBusiness(request, env);
      }

      /* ============================================================
         PUBLIC SHOWS
      ============================================================ */
      if (path === "/api/shows" && request.method === "GET") {
        return listShows(env);
      }
      if (path.startsWith("/api/shows/") && request.method === "GET") {
        const id = path.split("/").pop();
        return getShow(env, id);
      }

      /* ============================================================
         BUYER
      ============================================================ */
      if (path === "/api/buyer/tickets" && request.method === "GET") {
        return requireRole(request, env, ["buyer"], listTickets);
      }
      if (path === "/api/buyer/purchases" && request.method === "GET") {
        return requireRole(request, env, ["buyer"], listPurchases);
      }
      if (path === "/api/buyer/tickets/create" && request.method === "POST") {
        return requireRole(request, env, ["buyer"], createTicket);
      }

      /* ============================================================
         SKATER
      ============================================================ */
      if (path === "/api/skater/dashboard" && request.method === "GET") {
        return requireRole(request, env, ["skater"], skaterDashboard);
      }
      if (path === "/api/skater/shows" && request.method === "GET") {
        return requireRole(request, env, ["skater"], listSkaterShows);
      }
      if (path === "/api/skater/show/create" && request.method === "POST") {
        return requireRole(request, env, ["skater"], createShow);
      }
      if (path === "/api/skater/profile" && request.method === "POST") {
        return requireRole(request, env, ["skater"], updateSkaterProfile);
      }

      /* ============================================================
         BUSINESS
      ============================================================ */
      if (path === "/api/business/dashboard" && request.method === "GET") {
        return requireRole(request, env, ["business"], businessDashboard);
      }
      if (path === "/api/business/offers" && request.method === "POST") {
        return requireRole(request, env, ["business"], createOffer);
      }
      if (path === "/api/business/offers" && request.method === "GET") {
        return requireRole(request, env, ["business"], listBusinessOffers);
      }
      if (path === "/api/contracts" && request.method === "POST") {
        return requireRole(request, env, ["business", "skater"], createContract);
      }
      if (path === "/api/contracts" && request.method === "GET") {
        return requireRole(request, env, ["business"], listContracts);
      }

      /* ============================================================
         MUSICIANS
      ============================================================ */
      if (path === "/api/musician/dashboard" && request.method === "GET") {
        return requireRole(request, env, ["musician"], musicianDashboard);
      }
      if (path === "/api/music/upload" && request.method === "POST") {
        return requireRole(request, env, ["musician"], uploadTrack);
      }
      if (path === "/api/music/library" && request.method === "GET") {
        return listMusic(env);
      }
      if (path === "/api/music/license" && request.method === "POST") {
        return requireRole(request, env, ["skater"], licenseTrack);
      }

      /* ============================================================
         OWNER REALM (FULLY WIRED)
      ============================================================ */
      if (path === "/api/owner/overview") return ownerOverview(request, env);
      if (path === "/api/owner/users") return ownerUsers(request, env);
      if (path === "/api/owner/skaters") return ownerSkaters(request, env);
      if (path === "/api/owner/businesses") return ownerBusinesses(request, env);
      if (path === "/api/owner/musicians") return ownerMusicians(request, env);
      if (path === "/api/owner/shows") return ownerShows(request, env);
      if (path === "/api/owner/contracts") return ownerContracts(request, env);
      if (path === "/api/owner/music") return ownerMusic(request, env);
      if (path === "/api/owner/settings/branding") return ownerSettingsBranding(request, env);
      if (path === "/api/owner/settings/notes") return ownerSettingsNotes(request, env);

      /* ============================================================
         WEBHOOK
      ============================================================ */
      if (path === "/api/webhooks/partner" && request.method === "POST") {
        return partnerWebhook(request, env);
      }

      /* ============================================================
         NOT FOUND
      ============================================================ */
      return json({ error: "Not found" }, 404);

    } catch (err) {
      return json({ error: "Worker crashed", detail: String(err) }, 500);
    }
  }
};
