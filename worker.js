// worker.js — FINAL MODULE WORKER (PBKDF2-COMPATIBLE)

import {
  cors,
  apiJson,
  requireRole,
  signupBase
} from "./users.js";

import loginHandler from "./api/login.js";

import {
  signupBuyer,
  listTickets,
  createTicket,
  partnerWebhook,
  checkInTicket,
  buyerDashboard
} from "./buyers.js";

import { makeSkatersApi } from "./skaters.js";

import {
  signupBusiness,
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
  businessScanTicket
} from "./business.js";

import {
  signupMusician,
  musicianDashboard,
  uploadTrack,
  listMusic,
  licenseTrack,
  musicianCreateOffer,
  listMusicianOffers
} from "./musicians.js";

import { ownerDashboard } from "./routes/owner.js";

// ============================================================
// CORS WRAPPER
// ============================================================

function withCORS(response) {
  const headers = cors();
  for (const [k, v] of Object.entries(headers)) {
    response.headers.set(k, v);
  }
  return response;
}

// ============================================================
// MODULE WORKER ENTRYPOINT
// ============================================================

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors() });
    }

    // ============================================================
    // AUTH WORKER FORWARDING
    // ============================================================

    if (path === "/api/auth/hash" && method === "POST") {
      const upstream = await fetch("https://rollshow-auth.boardwalkclay1.workers.dev/hash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await request.text()
      });

      return withCORS(new Response(upstream.body, {
        status: upstream.status,
        headers: upstream.headers
      }));
    }

    if (path === "/api/auth/verify" && method === "POST") {
      const upstream = await fetch("https://rollshow-auth.boardwalkclay1.workers.dev/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await request.text()
      });

      return withCORS(new Response(upstream.body, {
        status: upstream.status,
        headers: upstream.headers
      }));
    }

    // ============================================================
    // LOGIN
    // ============================================================

    if (path === "/api/login" && method === "POST") {
      return withCORS(await loginHandler(request.clone(), env));
    }

    // ============================================================
    // SIGNUP ROUTES
    // ============================================================

    if (path === "/api/buyer/signup" && method === "POST") {
      return withCORS(await signupBuyer(request.clone(), env));
    }

    if (path === "/api/skater/signup" && method === "POST") {
      return withCORS(await signupBase(request.clone(), env, "skater"));
    }

    if (path === "/api/musician/signup" && method === "POST") {
      return withCORS(await signupMusician(request.clone(), env));
    }

    if (path === "/api/business/signup" && method === "POST") {
      return withCORS(await signupBusiness(request.clone(), env));
    }

    // INIT SKATER API
    const Skaters = makeSkatersApi(env.DB_roll);

    // ============================================================
    // SKATER ROUTES
    // ============================================================

    if (path === "/api/skater/dashboard" && method === "GET") {
      return withCORS(
        await requireRole(request.clone(), env, ["skater"], async (req, envInner, user) =>
          Skaters.getSkaterProfile(user.id)
        )
      );
    }

    if (path === "/api/skater/profile" && method === "PUT") {
      return withCORS(
        await requireRole(request.clone(), env, ["skater"], async (req, envInner, user) => {
          const body = await req.json();
          return Skaters.updateSkaterProfile(user.profile_id, body);
        })
      );
    }

    if (path === "/api/skater/offerings" && method === "POST") {
      return withCORS(
        await requireRole(request.clone(), env, ["skater"], async (req, envInner, user) => {
          const body = await req.json();
          return Skaters.createSkaterOffering(user.profile_id, body);
        })
      );
    }

    if (path === "/api/skater/offerings" && method === "GET") {
      return withCORS(
        await requireRole(request.clone(), env, ["skater"], async (req, envInner, user) =>
          Skaters.listSkaterOfferings(user.profile_id)
        )
      );
    }

    if (path === "/api/skater/shows" && method === "POST") {
      return withCORS(
        await requireRole(request.clone(), env, ["skater"], async (req, envInner, user) => {
          const body = await req.json();
          return Skaters.createShowForSkaterOrGroup({
            host_type: "skater",
            host_id: user.profile_id,
            ...body
          });
        })
      );
    }

    if (path === "/api/skater/shows" && method === "GET") {
      return withCORS(
        await requireRole(request.clone(), env, ["skater"], async (req, envInner, user) =>
          Skaters.listShowsForHost("skater", user.profile_id)
        )
      );
    }

    // ============================================================
    // MUSICIAN ROUTES
    // ============================================================

    if (path === "/api/musician/dashboard" && method === "GET") {
      return withCORS(await requireRole(request.clone(), env, ["musician"], musicianDashboard));
    }

    if (path === "/api/musician/tracks" && method === "GET") {
      return withCORS(await requireRole(request.clone(), env, ["musician"], listMusic));
    }

    if (path === "/api/musician/tracks" && method === "POST") {
      return withCORS(await requireRole(request.clone(), env, ["musician"], uploadTrack));
    }

    if (path === "/api/musician/license" && method === "POST") {
      return withCORS(await requireRole(request.clone(), env, ["musician"], licenseTrack));
    }

    // ============================================================
    // BUSINESS ROUTES
    // ============================================================

    if (path === "/api/business/dashboard" && method === "GET") {
      return withCORS(await requireRole(request.clone(), env, ["business"], businessDashboard));
    }

    if (path === "/api/business/offers" && method === "POST") {
      return withCORS(await requireRole(request.clone(), env, ["business"], businessSubmitOffer));
    }

    if (path === "/api/business/events" && method === "POST") {
      return withCORS(await requireRole(request.clone(), env, ["business"], businessSubmitEvent));
    }

    if (path === "/api/business/ads" && method === "POST") {
      return withCORS(await requireRole(request.clone(), env, ["business"], businessSubmitAd));
    }

    if (path === "/api/business/staff" && method === "POST") {
      return withCORS(await requireRole(request.clone(), env, ["business"], businessAddStaff));
    }

    if (path === "/api/business/staff" && method === "DELETE") {
      return withCORS(await requireRole(request.clone(), env, ["business"], businessRemoveStaff));
    }

    if (path === "/api/business/staff" && method === "GET") {
      return withCORS(await requireRole(request.clone(), env, ["business"], businessListStaff));
    }

    if (path === "/api/business/scan-ticket" && method === "POST") {
      return withCORS(await requireRole(request.clone(), env, ["business"], businessScanTicket));
    }

    // ============================================================
    // BUYER ROUTES
    // ============================================================

    if (path === "/api/buyer/dashboard" && method === "GET") {
      return withCORS(await requireRole(request.clone(), env, ["buyer"], buyerDashboard));
    }

    if (path === "/api/buyer/tickets" && method === "GET") {
      return withCORS(await requireRole(request.clone(), env, ["buyer"], listTickets));
    }

    if (path === "/api/buyer/tickets" && method === "POST") {
      return withCORS(await requireRole(request.clone(), env, ["buyer"], createTicket));
    }

    if (path === "/api/buyer/partner-webhook" && method === "POST") {
      return withCORS(await partnerWebhook(request.clone(), env));
    }

    // ============================================================
    // OWNER ROUTES
    // ============================================================

    if (path === "/api/owner/dashboard" && method === "GET") {
      return withCORS(await requireRole(request.clone(), env, ["owner"], ownerDashboard));
    }

    // ============================================================
    // FALLBACK
    // ============================================================

    return withCORS(apiJson({ message: "Not found" }, 404));
  }
};
// force rebuild 1776021764
// rebuild 1776021970
// module rebuild 1776022017
// module rebuild 1776022063
// module rebuild 1776023029
// rebuild 1776023108
// rebuild 1776023154
// rebuild 1776023402
// rebuild 1776023450
// rebuild 1776023494
// rebuild 1776023537
