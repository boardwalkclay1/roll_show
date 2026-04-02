// worker.js — FULL CLEAN REBUILD WITH AUTO MIGRATION RUNNER

import {
  cors,
  apiJson,
  login,
  requireRole
} from "./users.js";

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
  updateSkaterProfile,
  skaterBusinesses,
  skaterContactBusiness
} from "./skaters.js";

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
  ownerSettingsNotes,
  ownerBusinessApplications,
  ownerBusinessUpdateStatus,
  ownerAds,
  ownerUpdateAdStatus,
  ownerSponsorships
} from "./routes/owner.js";

/* ============================================================
   LOGGING
============================================================ */
function logRequest(request, extra = {}) {
  const url = new URL(request.url);
  console.log(JSON.stringify({
    path: url.pathname,
    method: request.method,
    ...extra
  }));
}

/* ============================================================
   OWNER OVERRIDE
============================================================ */
async function withOwnerOverride(request, env, allowedRoles, handler) {
  const url = new URL(request.url);
  const ownerOverride = url.searchParams.get("owner");
  const userId = url.searchParams.get("user");

  const cloned = request.clone();

  if (ownerOverride === "1" && userId) {
    const user = await env.DB_users
      .prepare("SELECT * FROM users WHERE id = ?")
      .bind(userId)
      .first();

    if (!user) return apiJson({ message: "User not found" }, 404);

    const ownerUser = { ...user, role: "owner" };
    return handler(cloned, env, ownerUser);
  }

  return requireRole(cloned, env, allowedRoles, handler);
}

/* ============================================================
   AUTO-DETECT MIGRATION RUNNER
============================================================ */
async function runAllMigrations(request, env, user) {
  const base = new URL(request.url);
  const listUrl = new URL("/migrations/", base).toString();

  // Cloudflare serves folder index as HTML
  const indexHtml = await fetch(listUrl).then(r => r.text());

  // Extract all .sql filenames
  const files = [...indexHtml.matchAll(/>(\d+[^<]+\.sql)</g)]
    .map(m => m[1])
    .sort();

  const results = [];

  for (const file of files) {
    const sqlUrl = new URL(`/migrations/${file}`, base).toString();
    const sql = await fetch(sqlUrl).then(r => r.text());

    await env.DB_users.exec(sql);
    results.push({ file, status: "executed" });
  }

  return apiJson({ success: true, ran: results });
}

/* ============================================================
   MAIN ROUTER
============================================================ */
export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      logRequest(request);

      /* CORS */
      if (method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors() });
      }

      /* AUTH */
      if (path === "/api/login" && method === "POST") {
        return login(request.clone(), env);
      }

      /* SIGNUP */
      const signupRoutes = {
        "/api/buyer/signup": signupBuyer,
        "/api/skater/signup": signupSkater,
        "/api/musician/signup": signupMusician,
        "/api/business/signup": signupBusiness
      };

      if (signupRoutes[path] && method === "POST") {
        return signupRoutes[path](request.clone(), env);
      }

      /* PUBLIC SHOWS */
      if (path === "/api/shows" && method === "GET") {
        return listShows(env);
      }

      if (path.startsWith("/api/shows/") && method === "GET") {
        const id = path.split("/").pop();
        return getShow(env, id);
      }

      /* ============================================================
         SKATER
      ============================================================ */
      if (path === "/api/skater/dashboard" && method === "GET") {
        return requireRole(request.clone(), env, ["skater"], skaterDashboard);
      }

      if (path === "/api/skater/shows" && method === "GET") {
        return requireRole(request.clone(), env, ["skater"], listSkaterShows);
      }

      if (path === "/api/skater/shows" && method === "POST") {
        return requireRole(request.clone(), env, ["skater"], createShow);
      }

      if (path === "/api/skater/profile" && method === "PUT") {
        return requireRole(request.clone(), env, ["skater"], updateSkaterProfile);
      }

      if (path === "/api/skater/businesses" && method === "GET") {
        return requireRole(request.clone(), env, ["skater"], skaterBusinesses);
      }

      if (path === "/api/skater/contact-business" && method === "POST") {
        return requireRole(request.clone(), env, ["skater"], skaterContactBusiness);
      }

      /* ============================================================
         MUSICIAN
      ============================================================ */
      if (path === "/api/musician/dashboard" && method === "GET") {
        return requireRole(request.clone(), env, ["musician"], musicianDashboard);
      }

      if (path === "/api/musician/tracks" && method === "GET") {
        return requireRole(request.clone(), env, ["musician"], listMusic);
      }

      if (path === "/api/musician/tracks" && method === "POST") {
        return requireRole(request.clone(), env, ["musician"], uploadTrack);
      }

      if (path === "/api/musician/license" && method === "POST") {
        return requireRole(request.clone(), env, ["musician"], licenseTrack);
      }

      /* ============================================================
         BUSINESS
      ============================================================ */
      if (path === "/api/business/dashboard" && method === "GET") {
        return requireRole(request.clone(), env, ["business"], businessDashboard);
      }

      if (path === "/api/business/offers" && method === "POST") {
        return requireRole(request.clone(), env, ["business"], createOffer);
      }

      if (path === "/api/business/offers" && method === "GET") {
        return requireRole(request.clone(), env, ["business"], listBusinessOffers);
      }

      if (path === "/api/business/contracts" && method === "POST") {
        return requireRole(request.clone(), env, ["business"], createContract);
      }

      if (path === "/api/business/contracts" && method === "GET") {
        return requireRole(request.clone(), env, ["business"], listContracts);
      }

      if (path === "/api/business/ads" && method === "POST") {
        return requireRole(request.clone(), env, ["business"], businessCreateAd);
      }

      if (path === "/api/business/events" && method === "POST") {
        return requireRole(request.clone(), env, ["business"], businessCreateEvent);
      }

      /* ============================================================
         OWNER
      ============================================================ */
      if (path === "/api/owner/run-migrations" && method === "POST") {
        return withOwnerOverride(request.clone(), env, ["owner"], runAllMigrations);
      }

      if (path === "/api/owner/overview" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerOverview);
      }

      if (path === "/api/owner/users" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerUsers);
      }

      if (path === "/api/owner/skaters" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerSkaters);
      }

      if (path === "/api/owner/businesses" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerBusinesses);
      }

      if (path === "/api/owner/musicians" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerMusicians);
      }

      if (path === "/api/owner/shows" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerShows);
      }

      if (path === "/api/owner/contracts" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerContracts);
      }

      if (path === "/api/owner/music" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerMusic);
      }

      if (path === "/api/owner/settings/branding" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerSettingsBranding);
      }

      if (path === "/api/owner/settings/notes" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerSettingsNotes);
      }

      if (path === "/api/owner/business-applications" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerBusinessApplications);
      }

      if (path === "/api/owner/business-applications" && method === "POST") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerBusinessUpdateStatus);
      }

      if (path === "/api/owner/ads" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerAds);
      }

      if (path === "/api/owner/ads" && method === "POST") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerUpdateAdStatus);
      }

      if (path === "/api/owner/sponsorships" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerSponsorships);
      }

      /* ============================================================
         SYSTEM (STUBS)
      ============================================================ */
      if (path === "/api/messages" && method === "GET") {
        return apiJson({ data: [], success: true });
      }

      if (path === "/api/notifications" && method === "GET") {
        return apiJson({ data: [], success: true });
      }

      if (path === "/api/search" && method === "GET") {
        return apiJson({ data: [], success: true });
      }

      if (path === "/api/map" && method === "GET") {
        return apiJson({ data: [], success: true });
      }

      if (path === "/api/settings" && method === "GET") {
        return apiJson({ data: {}, success: true });
      }

      /* ============================================================
         FALLBACK
      ============================================================ */
      return apiJson({ message: "Not found" }, 404);

    } catch (err) {
      console.error("Worker crashed:", err);
      return apiJson({ message: "Worker crashed", detail: String(err) }, 500);
    }
  }
};
