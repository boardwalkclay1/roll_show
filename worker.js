// worker.js — FULL CLEAN REBUILD WITH AUTH PIPELINE + OWNER OVERRIDE + MIGRATIONS + MEDIA (R2 + KV)

import bcrypt from "bcryptjs";

import {
  cors,
  apiJson,
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
   MIGRATIONS
============================================================ */
async function runAllMigrations(request, env, user) {
  const base = new URL(request.url);
  const listUrl = new URL("/migrations/", base).toString();

  const indexHtml = await fetch(listUrl).then(r => r.text());

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
   MEDIA HELPERS (R2 + KV)
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

      /* CORS */
      if (method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors() });
      }

      /* ============================================================
         ⭐ FIXED LOGIN ROUTE (UNLOCKS OWNER)
      ============================================================ */
      if (path === "/api/login" && method === "POST") {
        const body = await request.clone().json();
        const { email, password } = body;

        const row = await env.DB_users
          .prepare("SELECT id, email, role, password_hash FROM users WHERE email = ?")
          .bind(email)
          .first();

        if (!row) return apiJson({ success: false }, 401);

        const ok = await bcrypt.compare(password, row.password_hash);
        if (!ok) return apiJson({ success: false }, 401);

        const is_owner = row.role === "owner";

        return apiJson({
          success: true,
          user: {
            id: row.id,
            email: row.email,
            role: row.role,
            is_owner
          }
        });
      }

      /* ============================================================
         SIGNUP
      ============================================================ */
      const signupRoutes = {
        "/api/buyer/signup": signupBuyer,
        "/api/skater/signup": signupSkater,
        "/api/musician/signup": signupMusician,
        "/api/business/signup": signupBusiness
      };

      if (signupRoutes[path] && method === "POST") {
        return signupRoutes[path](request.clone(), env);
      }

      /* ============================================================
         PUBLIC SHOWS
      ============================================================ */
      if (path === "/api/shows" && method === "GET") {
        return listShows(env);
      }

      if (path.startsWith("/api/shows/") && method === "GET") {
        const id = path.split("/").pop();
        return getShow(env, id);
      }

      /* ============================================================
         MEDIA
      ============================================================ */
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
         SYSTEM STUBS
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
