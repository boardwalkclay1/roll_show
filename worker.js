// worker.js — EXPANDED, ROUTES CONSOLIDATED, OWNER OVERRIDE INTACT

import {
  cors,
  apiJson,
  requireRole,
  login as userLogin
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

/* ===== NEW ENGINES (IMPLEMENT LATER IN SEPARATE FILES) ==================== */

import * as Contracts from "./contracts.js";      // /api/contracts/*
import * as Tickets from "./tickets.js";          // /api/tickets/*
import * as Merch from "./merch.js";              // /api/merch/*
import * as Music from "./music.js";              // /api/music/*
import * as Skatecards from "./skatecards.js";    // /api/skatecards/*
import * as Branding from "./branding.js";        // /api/branding/*
import * as Feed from "./feed.js";                // /api/feed/*
import * as Events from "./events.js";            // /api/events/*
import * as Affiliates from "./affiliates.js";    // /api/affiliate/*
import * as Discounts from "./discounts.js";      // /api/discount/*
import * as Staff from "./staff.js";              // /api/business/staff/*
import * as Library from "./library.js";          // /api/library/*

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
   AUTH HEADER INJECTION
============================================================ */
function attachAuthHeaders(request) {
  const raw = request.headers.get("x-user");
  if (!raw) return request;

  try {
    const user = JSON.parse(raw);
    const newHeaders = new Headers(request.headers);

    if (user.id) newHeaders.set("x-user-id", user.id);
    if (user.role) newHeaders.set("x-user-role", user.role);

    return new Request(request, { headers: newHeaders });
  } catch {
    return request;
  }
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
   MEDIA HELPERS
============================================================ */
async function saveMediaMeta(env, id, meta) {
  await env.KV.put(`media:${id}`, JSON.stringify(meta));
}

async function getMediaMeta(env, id) {
  const raw = await env.KV.get(`media:${id}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

/* ============================================================
   MEDIA: INIT UPLOAD
============================================================ */
async function mediaInitUpload(request, env, user) {
  const { type, filename, contentType, size } = await request.json();

  if (!type || !filename || !contentType) {
    return apiJson({ message: "Missing fields" }, 400);
  }

  const allowed = ["music", "video", "photo"];
  if (!allowed.includes(type)) {
    return apiJson({ message: "Invalid type" }, 400);
  }

  const id = crypto.randomUUID();
  const key = `${type}/${id}-${filename}`;
  const created_at = new Date().toISOString();

  const meta = {
    id,
    key,
    type,
    filename,
    contentType,
    size: size || null,
    user_id: user.id,
    created_at
  };

  await saveMediaMeta(env, id, meta);

  return apiJson({
    media: meta,
    uploadPath: `/api/media/upload/${id}`
  });
}

/* ============================================================
   MEDIA: UPLOAD FILE
============================================================ */
async function mediaUpload(request, env, user, id) {
  const meta = await getMediaMeta(env, id);
  if (!meta) return apiJson({ message: "Media not initialized" }, 404);

  if (meta.user_id !== user.id && user.role !== "owner") {
    return apiJson({ message: "Forbidden" }, 403);
  }

  const contentType =
    meta.contentType ||
    request.headers.get("Content-Type") ||
    "application/octet-stream";

  await env.R2.put(meta.key, request.body, {
    httpMetadata: { contentType }
  });

  return apiJson({ message: "Uploaded", id, key: meta.key });
}

/* ============================================================
   MEDIA: GET META
============================================================ */
async function mediaGetMeta(request, env, user, id) {
  const meta = await getMediaMeta(env, id);
  if (!meta) return apiJson({ message: "Not found" }, 404);

  return apiJson({ media: meta });
}

/* ============================================================
   MEDIA: STREAM FILE
============================================================ */
async function mediaGetFile(request, env, user, id) {
  const meta = await getMediaMeta(env, id);
  if (!meta) return apiJson({ message: "Not found" }, 404);

  const obj = await env.R2.get(meta.key);
  if (!obj) return apiJson({ message: "File missing" }, 404);

  const headers = {
    "Content-Type": obj.httpMetadata?.contentType || "application/octet-stream",
    "Cache-Control": "public, max-age=3600"
  };

  return new Response(obj.body, { status: 200, headers });
}

/* ============================================================
   MAIN ROUTER
============================================================ */
export default {
  async fetch(request, env, ctx) {
    try {
      request = attachAuthHeaders(request);

      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      logRequest(request);

      if (method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors() });
      }

      /* LOGIN */
      if (path === "/api/login" && method === "POST") {
        return userLogin(request.clone(), env);
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

      /* MEDIA */
      if (path === "/api/media/init-upload" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["musician", "skater", "business", "owner"],
          mediaInitUpload
        );
      }

      if (path.startsWith("/api/media/upload/") && method === "PUT") {
        const id = path.split("/").pop();
        return requireRole(
          request.clone(),
          env,
          ["musician", "skater", "business", "owner"],
          (req, envInner, user) => mediaUpload(req, envInner, user, id)
        );
      }

      if (path.startsWith("/api/media/meta/") && method === "GET") {
        const id = path.split("/").pop();
        return requireRole(
          request.clone(),
          env,
          ["musician", "skater", "business", "buyer", "owner"],
          (req, envInner, user) => mediaGetMeta(req, envInner, user, id)
        );
      }

      if (path.startsWith("/api/media/file/") && method === "GET") {
        const id = path.split("/").pop();
        return requireRole(
          request.clone(),
          env,
          ["musician", "skater", "business", "buyer", "owner"],
          (req, envInner, user) => mediaGetFile(req, envInner, user, id)
        );
      }

      /* ========================================================
         SKATER
      ========================================================= */
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

      /* ========================================================
         MUSICIAN
      ========================================================= */
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

      /* ========================================================
         BUSINESS
      ========================================================= */
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

      /* ========================================================
         BUYER (EXISTING BUYER API HOOKS)
      ========================================================= */
      if (path === "/api/buyer/tickets" && method === "GET") {
        return requireRole(request.clone(), env, ["buyer"], listTickets);
      }

      if (path === "/api/buyer/purchases" && method === "GET") {
        return requireRole(request.clone(), env, ["buyer"], listPurchases);
      }

      if (path === "/api/buyer/tickets" && method === "POST") {
        return requireRole(request.clone(), env, ["buyer"], createTicket);
      }

      if (path === "/api/buyer/partner-webhook" && method === "POST") {
        // no role check: external webhook
        return partnerWebhook(request.clone(), env);
      }

      /* ========================================================
         CONTRACT ENGINE (GLOBAL)
      ========================================================= */
      if (path === "/api/contracts" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "business", "owner"],
          Contracts.createContract
        );
      }

      if (path === "/api/contracts/counter" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "business", "owner"],
          Contracts.counterContract
        );
      }

      if (path === "/api/contracts/approve" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "business", "owner"],
          Contracts.approveContract
        );
      }

      if (path === "/api/contracts/reject" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "business", "owner"],
          Contracts.rejectContract
        );
      }

      if (path === "/api/contracts" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "business", "owner"],
          Contracts.listContracts
        );
      }

      if (path.startsWith("/api/contracts/") && method === "GET") {
        const id = path.split("/").pop();
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "business", "owner"],
          (req, envInner, user) => Contracts.getContract(req, envInner, user, id)
        );
      }

      /* ========================================================
         TICKET ENGINE (GLOBAL)
      ========================================================= */
      if (path === "/api/tickets/create" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["owner", "skater", "business"],
          Tickets.createTicketType
        );
      }

      if (path === "/api/tickets/purchase" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["buyer", "business"],
          Tickets.purchaseTicket
        );
      }

      if (path.startsWith("/api/tickets/qr/") && method === "GET") {
        const id = path.split("/").pop();
        return requireRole(
          request.clone(),
          env,
          ["buyer", "business", "owner", "skater"],
          (req, envInner, user) => Tickets.getTicketQr(req, envInner, user, id)
        );
      }

      if (path === "/api/tickets/scan" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["business", "owner"],
          Tickets.scanTicket
        );
      }

      if (path === "/api/tickets" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["buyer", "skater", "business", "owner"],
          Tickets.listUserTickets
        );
      }

      if (path === "/api/tickets/validate" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["business", "owner"],
          Tickets.validateTicket
        );
      }

      /* ========================================================
         MERCH ENGINE
      ========================================================= */
      if (path === "/api/merch" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "business", "owner"],
          Merch.createMerch
        );
      }

      if (path === "/api/merch" && method === "PUT") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "business", "owner"],
          Merch.updateMerch
        );
      }

      if (path === "/api/merch" && method === "GET") {
        return Merch.listMerch(request.clone(), env);
      }

      if (path === "/api/merch/purchase" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["buyer", "business"],
          Merch.purchaseMerch
        );
      }

      if (path.startsWith("/api/merch/qr/") && method === "GET") {
        const id = path.split("/").pop();
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "business", "owner"],
          (req, envInner, user) => Merch.getMerchQr(req, envInner, user, id)
        );
      }

      /* ========================================================
         MUSIC ENGINE
      ========================================================= */
      if (path === "/api/music/upload" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["musician"],
          Music.uploadTrack
        );
      }

      if (path === "/api/music" && method === "GET") {
        return Music.listAllMusic(request.clone(), env);
      }

      if (path === "/api/music/purchase" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["buyer"],
          Music.purchaseTrack
        );
      }

      if (path === "/api/music/license" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "owner"],
          Music.requestLicense
        );
      }

      if (path === "/api/music/approve" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["musician", "owner"],
          Music.approveLicense
        );
      }

      /* ========================================================
         SKATE CARDS ENGINE
      ========================================================= */
      if (path === "/api/skatecards" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater"],
          Skatecards.createSkatecard
        );
      }

      if (path === "/api/skatecards" && method === "PUT") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "owner"],
          Skatecards.updateSkatecard
        );
      }

      if (path === "/api/skatecards" && method === "GET") {
        return Skatecards.listSkatecards(request.clone(), env);
      }

      if (path === "/api/skatecards/purchase" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["buyer", "skater", "musician", "business"],
          Skatecards.purchaseSkatecard
        );
      }

      /* ========================================================
         BRANDING ENGINE
      ========================================================= */
      if (path === "/api/branding/skater" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["skater"],
          Branding.getSkaterBranding
        );
      }

      if (path === "/api/branding/skater" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater"],
          Branding.updateSkaterBranding
        );
      }

      if (path === "/api/branding/business" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["business"],
          Branding.getBusinessBranding
        );
      }

      if (path === "/api/branding/business" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["business"],
          Branding.updateBusinessBranding
        );
      }

      if (path === "/api/branding/ticket" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "owner"],
          Branding.updateTicketBranding
        );
      }

      if (path === "/api/branding/skatecard" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "owner"],
          Branding.updateSkatecardBranding
        );
      }

      /* ========================================================
         FEED ENGINE
      ========================================================= */
      if (path === "/api/feed/skater" && method === "GET") {
        return Feed.getSkaterFeed(request.clone(), env);
      }

      if (path === "/api/feed/events" && method === "GET") {
        return Feed.getEventsFeed(request.clone(), env);
      }

      if (path === "/api/feed/business" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["skater"],
          Feed.getBusinessFeed
        );
      }

      if (path === "/api/feed/post" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater"],
          Feed.createPost
        );
      }

      if (path === "/api/feed/like" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "buyer"],
          Feed.likePost
        );
      }

      if (path === "/api/feed/comment" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "buyer"],
          Feed.commentOnPost
        );
      }

      if (path === "/api/feed/share" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["skater", "musician", "buyer"],
          Feed.sharePost
        );
      }

      /* ========================================================
         EVENTS ENGINE
      ========================================================= */
      if (path === "/api/events" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["business", "owner", "skater"],
          Events.createEvent
        );
      }

      if (path === "/api/events/approve" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["owner"],
          Events.approveEvent
        );
      }

      if (path === "/api/events" && method === "GET") {
        return Events.listEvents(request.clone(), env);
      }

      if (path.startsWith("/api/events/") && method === "GET") {
        const id = path.split("/").pop();
        return Events.getEvent(request.clone(), env, id);
      }

      /* ========================================================
         AFFILIATE + DISCOUNT ENGINES
      ========================================================= */
      if (path === "/api/affiliate" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["business"],
          Affiliates.createAffiliateCampaign
        );
      }

      if (path === "/api/affiliate/approve" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["owner"],
          Affiliates.approveAffiliateCampaign
        );
      }

      if (path === "/api/affiliate" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["business", "owner"],
          Affiliates.listAffiliateCampaigns
        );
      }

      if (path === "/api/discount" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["business"],
          Discounts.createDiscount
        );
      }

      if (path === "/api/discount/approve" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["owner"],
          Discounts.approveDiscount
        );
      }

      if (path === "/api/discount" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["business", "owner"],
          Discounts.listDiscounts
        );
      }

      /* ========================================================
         BUSINESS STAFF PERMISSIONS
      ========================================================= */
      if (path === "/api/business/staff" && method === "POST") {
        return requireRole(
          request.clone(),
          env,
          ["business"],
          Staff.addStaff
        );
      }

      if (path === "/api/business/staff" && method === "DELETE") {
        return requireRole(
          request.clone(),
          env,
          ["business"],
          Staff.removeStaff
        );
      }

      if (path === "/api/business/staff" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["business"],
          Staff.listStaff
        );
      }

      /* ========================================================
         LIBRARY ROUTES (MUSIC / MERCH / SKATECARDS / TICKETS)
      ========================================================= */
      if (path === "/api/library/music" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["buyer", "skater", "musician"],
          Library.getMusicLibrary
        );
      }

      if (path === "/api/library/merch" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["buyer", "skater", "musician"],
          Library.getMerchLibrary
        );
      }

      if (path === "/api/library/skatecards" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["buyer", "skater", "musician", "business"],
          Library.getSkatecardLibrary
        );
      }

      if (path === "/api/library/tickets" && method === "GET") {
        return requireRole(
          request.clone(),
          env,
          ["buyer", "skater", "business"],
          Library.getTicketLibrary
        );
      }

      /* ========================================================
         OWNER
      ========================================================= */
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

      if (path === "/api/owner/settings/branding" && method === "POST") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerSettingsBranding);
      }

      if (path === "/api/owner/settings/notes" && method === "GET") {
        return withOwnerOverride(request.clone(), env, ["owner"], ownerSettingsNotes);
      }

      if (path === "/api/owner/settings/notes" && method === "POST") {
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

      /* FALLBACK */
      return apiJson({ message: "Not found" }, 404);

    } catch (err) {
      console.error("Worker crashed:", err);
      return apiJson({ message: "Worker crashed", detail: String(err) }, 500);
    }
  }
};
