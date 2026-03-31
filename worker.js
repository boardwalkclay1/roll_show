import { cors, apiJson, login, requireRole } from "./users.js";

/* SIMPLE REQUEST LOGGER */
function logRequest(request, extra = {}) {
  const url = new URL(request.url);
  console.log(
    JSON.stringify({
      path: url.pathname,
      method: request.method,
      ...extra
    })
  );
}

/* OWNER OVERRIDE WRAPPER */
async function withOwnerOverride(request, env, allowedRoles, handler) {
  const url = new URL(request.url);
  const ownerOverride = url.searchParams.get("owner");
  const userId = url.searchParams.get("user");

  // If owner=1 and user is provided → treat that user as the acting user, bypass normal role check
  if (ownerOverride === "1" && userId) {
    logRequest(request, { ownerOverride: true, userId });

    const user = await env.DB_users.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(userId).first();

    if (!user) {
      return apiJson({ message: "User not found for owner override" }, 404);
    }

    // Force owner semantics for bypass
    const ownerUser = { ...user, role: "owner" };

    return handler(request, env, ownerUser);
  }

  // Normal role guard
  return requireRole(request, env, allowedRoles, handler);
}

/* BUYER */
import {
  signupBuyer,
  listTickets,
  listPurchases,
  createTicket,
  partnerWebhook
} from "./buyers.js";

/* SKATER */
import {
  signupSkater,
  listShows,
  getShow,
  skaterDashboard,
  listSkaterShows,
  createShow,
  updateSkaterProfile,
  skaterBusinesses,
  skaterContactBusiness
} from "./skaters.js";

/* BUSINESS */
import {
  signupBusiness,
  businessDashboard,
  createOffer,
  listBusinessOffers,
  createContract,
  listContracts,
  businessCreateAd,
  businessCreateEvent
} from "./business.js";

/* MUSICIAN */
import {
  signupMusician,
  musicianDashboard,
  uploadTrack,
  listMusic,
  licenseTrack
} from "./musicians.js";

/* OWNER */
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
  ownerSettingsNotes,
  ownerBusinessApplications,
  ownerBusinessUpdateStatus,
  ownerAds,
  ownerUpdateAdStatus,
  ownerSponsorships
} from "./routes/owner.js";

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      logRequest(request);

      /* ============================================================
         CORS
      ============================================================ */
      if (method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors() });
      }

      /* ============================================================
         AUTH
      ============================================================ */
      if (path === "/api/login" && method === "POST")
        return login(request, env);

      /* ============================================================
         SIGNUP
      ============================================================ */
      const signupRoutes = {
        "/api/buyer/signup": signupBuyer,
        "/api/skater/signup": signupSkater,
        "/api/musician/signup": signupMusician,
        "/api/business/signup": signupBusiness
      };

      if (signupRoutes[path] && method === "POST")
        return signupRoutes[path](request, env);

      /* ============================================================
         PUBLIC SHOWS
      ============================================================ */
      if (path === "/api/shows" && method === "GET")
        return listShows(env);

      if (path.startsWith("/api/shows/") && method === "GET") {
        const id = path.split("/").pop();
        return getShow(env, id);
      }

      /* ============================================================
         BUYER
      ============================================================ */
      const buyerRoutes = {
        "/api/buyer/tickets": { GET: listTickets },
        "/api/buyer/purchases": { GET: listPurchases },
        "/api/buyer/tickets/create": { POST: createTicket }
      };

      if (buyerRoutes[path] && buyerRoutes[path][method])
        return withOwnerOverride(request, env, ["buyer"], buyerRoutes[path][method]);

      /* ============================================================
         SKATER
      ============================================================ */
      const skaterRoutes = {
        "/api/skater/dashboard": { GET: skaterDashboard },
        "/api/skater/shows": { GET: listSkaterShows },
        "/api/skater/show/create": { POST: createShow },
        "/api/skater/profile": { POST: updateSkaterProfile },
        "/api/skater/businesses": { GET: skaterBusinesses },
        "/api/skater/contact-business": { POST: skaterContactBusiness }
      };

      if (skaterRoutes[path] && skaterRoutes[path][method])
        return withOwnerOverride(request, env, ["skater"], skaterRoutes[path][method]);

      /* ============================================================
         BUSINESS
      ============================================================ */
      const businessRoutes = {
        "/api/business/dashboard": { GET: businessDashboard },
        "/api/business/offers": { GET: listBusinessOffers, POST: createOffer },
        "/api/contracts": { GET: listContracts, POST: createContract },
        "/api/business/ads": { POST: businessCreateAd },
        "/api/business/events": { POST: businessCreateEvent }
      };

      if (businessRoutes[path] && businessRoutes[path][method])
        return withOwnerOverride(request, env, ["business"], businessRoutes[path][method]);

      /* ============================================================
         MUSICIAN
      ============================================================ */
      const musicianRoutes = {
        "/api/musician/dashboard": { GET: musicianDashboard },
        "/api/music/upload": { POST: uploadTrack },
        "/api/music/library": { GET: listMusic },
        "/api/music/license": { POST: licenseTrack }
      };

      if (musicianRoutes[path] && musicianRoutes[path][method]) {
        const roles =
          path === "/api/music/license" ? ["skater"] : ["musician"];
        return withOwnerOverride(request, env, roles, musicianRoutes[path][method]);
      }

      /* ============================================================
         OWNER
      ============================================================ */
      const ownerRoutes = {
        "/api/owner/overview": ownerOverview,
        "/api/owner/users": ownerUsers,
        "/api/owner/skaters": ownerSkaters,
        "/api/owner/businesses": ownerBusinesses,
        "/api/owner/musicians": ownerMusicians,
        "/api/owner/shows": ownerShows,
        "/api/owner/contracts": ownerContracts,
        "/api/owner/music": ownerMusic,
        "/api/owner/settings/branding": ownerSettingsBranding,
        "/api/owner/settings/notes": ownerSettingsNotes,
        "/api/owner/business/applications": ownerBusinessApplications,
        "/api/owner/business/applications/status": ownerBusinessUpdateStatus,
        "/api/owner/ads": ownerAds,
        "/api/owner/ads/status": ownerUpdateAdStatus,
        "/api/owner/sponsorships": ownerSponsorships
      };

      if (ownerRoutes[path] && (method === "GET" || method === "POST"))
        return ownerRoutes[path](request, env);

      /* ============================================================
         WEBHOOK
      ============================================================ */
      if (path === "/api/webhooks/partner" && method === "POST")
        return partnerWebhook(request, env);

      /* ============================================================
         NOT FOUND
      ============================================================ */
      return apiJson({ message: "Not found" }, 404);

    } catch (err) {
      console.error("Worker crashed:", err);
      return apiJson({ message: "Worker crashed", detail: String(err) }, 500);
    }
  }
};
