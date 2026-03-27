export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // CORS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, { status: 204, headers: cors() });
      }

      /* ===========================
         AUTH (GLOBAL)
      =========================== */

      if (path === "/api/login" && request.method === "POST") {
        return login(request, env);
      }

      /* ===========================
         SIGNUP (ROLE-SPECIFIC)
      =========================== */

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

      /* ===========================
         PUBLIC SKATER SHOWS
      =========================== */

      if (path === "/api/shows" && request.method === "GET") {
        return listShows(env);
      }

      if (path.startsWith("/api/shows/") && request.method === "GET") {
        const id = path.split("/").pop();
        return getShow(env, id);
      }

      /* ===========================
         BUYER AREA
      =========================== */

      if (path === "/api/buyer/tickets" && request.method === "GET") {
        return requireRole(request, env, ["buyer"], listTickets);
      }

      if (path === "/api/buyer/purchases" && request.method === "GET") {
        return requireRole(request, env, ["buyer"], listPurchases);
      }

      if (path === "/api/buyer/tickets/create" && request.method === "POST") {
        return requireRole(request, env, ["buyer"], createTicket);
      }

      /* ===========================
         SKATER AREA
      =========================== */

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

      /* ===========================
         BUSINESS / BRAND AREA
      =========================== */

      if (path === "/api/business/dashboard" && request.method === "GET") {
        return requireRole(request, env, ["business"], businessDashboard);
      }

      if (path === "/api/business/offers" && request.method === "POST") {
        return requireRole(request, env, ["business"], createOffer);
      }

      if (path === "/api/business/offers" && request.method === "GET") {
        return requireRole(request, env, ["business"], listBusinessOffers);
      }

      /* ===========================
         MUSIC / MUSICIANS AREA
      =========================== */

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

      /* ===========================
         CONTRACTS (SKATER ↔ BUSINESS ↔ MUSIC)
      =========================== */

      if (path === "/api/contracts" && request.method === "POST") {
        return requireRole(request, env, ["business", "skater"], createContract);
      }

      if (path === "/api/contracts" && request.method === "GET") {
        return requireRole(request, env, ["business", "skater"], listContracts);
      }

      /* ===========================
         WEBHOOK (PAYMENTS)
      =========================== */

      if (path === "/api/webhooks/partner" && request.method === "POST") {
        return partnerWebhook(request, env);
      }

      return json({ error: "Not found" }, 404);
    } catch (err) {
      return json({ error: "Worker crashed", detail: String(err) }, 500);
    }
  }
};

/* ============================================================
   AUTH (GLOBAL USERS)
============================================================ */

async function signupBase(env, { name, email, password, role }) {
  if (!name || !email || !password || !role) {
    return { error: "Missing fields" };
  }

  const exists = await env.DB_users.prepare(
    "SELECT id FROM users WHERE email = ?"
  ).bind(email).first();

  if (exists) {
    return { error: "Email already registered" };
  }

  const id = crypto.randomUUID();
  const created = new Date().toISOString();
  const hashed = await hash(password);

  await env.DB_users.prepare(
    `INSERT INTO users (id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(id, name, email, hashed, role, created).run();

  return { id, name, email, role, created_at: created };
}

async function signupBuyer(request, env) {
  const body = await request.json();
  body.role = "buyer";

  const base = await signupBase(env, body);
  if (base.error) return json({ success: false, error: base.error }, 400);

  await env.DB_buyers.prepare(
    `INSERT INTO buyers (id, user_id, phone, city, state, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    base.id,
    body.phone || null,
    body.city || null,
    body.state || null,
    base.created_at
  ).run();

  return json({ success: true, user: base });
}

async function signupSkater(request, env) {
  const body = await request.json();
  body.role = "skater";

  const base = await signupBase(env, body);
  if (base.error) return json({ success: false, error: base.error }, 400);

  await env.DB_skaters.prepare(
    `INSERT INTO skaters (id, user_id, bio, discipline, profile_image, clip_url, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    base.id,
    body.bio || null,
    body.discipline || null,
    body.profile_image || null,
    body.clip_url || null,
    base.created_at
  ).run();

  return json({ success: true, user: base });
}

async function signupMusician(request, env) {
  const body = await request.json();
  body.role = "musician";

  const base = await signupBase(env, body);
  if (base.error) return json({ success: false, error: base.error }, 400);

  await env.DB_musicians.prepare(
    `INSERT INTO musicians (id, user_id, bio, created_at)
     VALUES (?, ?, ?, ?)`
  ).bind(
    crypto.randomUUID(),
    base.id,
    body.bio || null,
    base.created_at
  ).run();

  return json({ success: true, user: base });
}

async function signupBusiness(request, env) {
  const body = await request.json();
  body.role = "business";

  const base = await signupBase(env, body);
  if (base.error) return json({ success: false, error: base.error }, 400);

  await env.DB_business.prepare(
    `INSERT INTO businesses (id, user_id, company_name, website, verified, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`
  ).bind(
    crypto.randomUUID(),
    base.id,
    body.company_name || body.name || null,
    body.website || null,
    base.created_at
  ).run();

  return json({ success: true, user: base });
}

async function login(request, env) {
  const { email, password } = await request.json();

  const row = await env.DB_users.prepare(
    "SELECT * FROM users WHERE email = ?"
  ).bind(email).first();

  if (!row) return json({ success: false, error: "Invalid credentials" }, 401);

  const valid = await verify(password, row.password_hash);
  if (!valid) return json({ success: false, error: "Invalid credentials" }, 401);

  return json({
    success: true,
    user: {
      id: row.id,
      name: row.name,
      email: row.email,
      role: row.role,
      created_at: row.created_at
    }
  });
}

/* ============================================================
   ROLE GUARDS (GLOBAL USERS)
============================================================ */

function getUserId(request) {
  return (
    request.headers.get("x-user-id") ||
    request.headers.get("x-buyer-id") ||
    request.headers.get("x-skater-id") ||
    request.headers.get("x-business-id")
  );
}

async function requireRole(request, env, allowedRoles, handler) {
  const userId = getUserId(request);
  if (!userId) return json({ error: "Unauthorized" }, 401);

  const user = await env.DB_users.prepare(
    "SELECT * FROM users WHERE id = ?"
  ).bind(userId).first();

  if (!user || !allowedRoles.includes(user.role)) {
    return json({ error: "Forbidden" }, 403);
  }

  return handler(request, env, user);
}

/* ============================================================
   PUBLIC SHOWS (FROM SKATERS DB)
============================================================ */

async function listShows(env) {
  const { results } = await env.DB_skaters.prepare(
    `SELECT s.*, sk.discipline, sk.bio
     FROM shows s
     JOIN skaters sk ON s.skater_id = sk.id
     ORDER BY s.created_at DESC`
  ).all();

  return json(results);
}

async function getShow(env, id) {
  const row = await env.DB_skaters.prepare(
    `SELECT s.*, sk.discipline, sk.bio
     FROM shows s
     JOIN skaters sk ON s.skater_id = sk.id
     WHERE s.id = ?`
  ).bind(id).first();

  if (!row) return json({ error: "Show not found" }, 404);

  return json(row);
}

/* ============================================================
   SKATER AREA (DB_skaters + DB_musicians + DB_business)
============================================================ */

async function skaterDashboard(request, env, user) {
  const skater = await env.DB_skaters.prepare(
    "SELECT * FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const shows = await env.DB_skaters.prepare(
    "SELECT * FROM shows WHERE skater_id = ? ORDER BY created_at DESC"
  ).bind(skater.id).all();

  const offers = await env.DB_business.prepare(
    `SELECT o.*
     FROM business_offers o
     WHERE o.skater_id = ? ORDER BY o.created_at DESC`
  ).bind(skater.id).all();

  const licenses = await env.DB_musicians.prepare(
    `SELECT l.*, t.title
     FROM track_licenses l
     JOIN tracks t ON l.track_id = t.id
     WHERE l.skater_id = ?
     ORDER BY l.created_at DESC`
  ).bind(skater.id).all();

  return json({
    skater,
    shows: shows.results,
    offers: offers.results,
    licenses: licenses.results
  });
}

async function listSkaterShows(request, env, user) {
  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const { results } = await env.DB_skaters.prepare(
    "SELECT * FROM shows WHERE skater_id = ? ORDER BY created_at DESC"
  ).bind(skater.id).all();

  return json(results);
}

async function createShow(request, env, user) {
  const { title, description, premiere_date, price_cents, thumbnail, video_url } =
    await request.json();

  if (!title) return json({ error: "Missing title" }, 400);

  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_skaters.prepare(
    `INSERT INTO shows (id, skater_id, title, description, price_cents, thumbnail, video_url, premiere_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(id, skater.id, title, description, price_cents, thumbnail, video_url, premiere_date, now).run();

  return json({ success: true, showId: id });
}

async function updateSkaterProfile(request, env, user) {
  const { discipline, bio, profile_image, clip_url } = await request.json();

  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  await env.DB_skaters.prepare(
    `UPDATE skaters SET discipline = ?, bio = ?, profile_image = ?, clip_url = ?
     WHERE id = ?`
  ).bind(discipline, bio, profile_image, clip_url, skater.id).run();

  return json({ success: true });
}

/* ============================================================
   BUSINESS / BRAND AREA (DB_business)
============================================================ */

async function businessDashboard(request, env, user) {
  const business = await env.DB_business.prepare(
    "SELECT * FROM businesses WHERE user_id = ?"
  ).bind(user.id).first();

  const offers = await env.DB_business.prepare(
    `SELECT * FROM business_offers WHERE business_id = ? ORDER BY created_at DESC`
  ).bind(business.id).all();

  const contracts = await env.DB_business.prepare(
    `SELECT c.*
     FROM business_contracts c
     JOIN business_offers o ON c.offer_id = o.id
     WHERE o.business_id = ?
     ORDER BY c.created_at DESC`
  ).bind(business.id).all();

  return json({
    business,
    offers: offers.results,
    contracts: contracts.results
  });
}

async function createOffer(request, env, user) {
  const { skaterId, amount, terms } = await request.json();

  const business = await env.DB_business.prepare(
    "SELECT id FROM businesses WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
    `INSERT INTO business_offers (id, business_id, skater_id, amount, terms, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?)`
  ).bind(id, business.id, skaterId, amount, terms, now).run();

  return json({ success: true, offerId: id });
}

async function listBusinessOffers(request, env, user) {
  const business = await env.DB_business.prepare(
    "SELECT id FROM businesses WHERE user_id = ?"
  ).bind(user.id).first();

  const { results } = await env.DB_business.prepare(
    "SELECT * FROM business_offers WHERE business_id = ? ORDER BY created_at DESC"
  ).bind(business.id).all();

  return json(results);
}

/* ============================================================
   CONTRACTS (CROSS-ROLE)
============================================================ */

async function createContract(request, env, user) {
  const { offerId, details } = await request.json();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_business.prepare(
    `INSERT INTO business_contracts (id, offer_id, details, status, created_at)
     VALUES (?, ?, ?, 'pending', ?)`
  ).bind(id, offerId, details, now).run();

  return json({ success: true, contractId: id });
}

async function listContracts(request, env, user) {
  const business = await env.DB_business.prepare(
    "SELECT id FROM businesses WHERE user_id = ?"
  ).bind(user.id).first();

  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const businessId = business ? business.id : null;
  const skaterId = skater ? skater.id : null;

  const { results } = await env.DB_business.prepare(
    `SELECT c.*, o.skater_id, o.business_id
     FROM business_contracts c
     JOIN business_offers o ON c.offer_id = o.id
     WHERE (o.skater_id = ? AND ? IS NOT NULL)
        OR (o.business_id = ? AND ? IS NOT NULL)
     ORDER BY c.created_at DESC`
  ).bind(skaterId, skaterId, businessId, businessId).all();

  return json(results);
}

/* ============================================================
   MUSIC / MUSICIANS (DB_musicians + DB_skaters)
============================================================ */

async function musicianDashboard(request, env, user) {
  const musician = await env.DB_musicians.prepare(
    "SELECT * FROM musicians WHERE user_id = ?"
  ).bind(user.id).first();

  const tracks = await env.DB_musicians.prepare(
    "SELECT * FROM tracks WHERE artist_id = ? ORDER BY created_at DESC"
  ).bind(musician.id).all();

  const licenses = await env.DB_musicians.prepare(
    `SELECT l.*, t.title
     FROM track_licenses l
     JOIN tracks t ON l.track_id = t.id
     WHERE t.artist_id = ?
     ORDER BY l.created_at DESC`
  ).bind(musician.id).all();

  return json({
    musician,
    tracks: tracks.results,
    licenses: licenses.results
  });
}

async function uploadTrack(request, env, user) {
  const { title, url } = await request.json();

  const musician = await env.DB_musicians.prepare(
    "SELECT id FROM musicians WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_musicians.prepare(
    `INSERT INTO tracks (id, artist_id, title, url, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, musician.id, title, url, now).run();

  return json({ success: true, trackId: id });
}

async function listMusic(env) {
  const { results } = await env.DB_musicians.prepare(
    "SELECT * FROM tracks ORDER BY created_at DESC"
  ).all();

  return json(results);
}

async function licenseTrack(request, env, user) {
  const { trackId, amount_cents } = await request.json();

  const skater = await env.DB_skaters.prepare(
    "SELECT id FROM skaters WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_musicians.prepare(
    `INSERT INTO track_licenses (id, track_id, skater_id, amount_cents, created_at)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(id, trackId, skater.id, amount_cents || 1000, now).run();

  return json({ success: true, licenseId: id });
}

/* ============================================================
   BUYER TICKETS (DB_buyers + DB_skaters)
============================================================ */

async function listTickets(request, env, user) {
  const buyer = await env.DB_buyers.prepare(
    "SELECT id FROM buyers WHERE user_id = ?"
  ).bind(user.id).first();

  const { results } = await env.DB_buyers.prepare(
    `SELECT t.*, s.title, s.premiere_date
     FROM tickets t
     JOIN ${"shows"} s ON t.show_id = s.id
     WHERE t.buyer_id = ? AND t.status = 'paid'
     ORDER BY t.created_at DESC`
  ).bind(buyer.id).all();

  return json(results);
}

async function listPurchases(request, env, user) {
  const buyer = await env.DB_buyers.prepare(
    "SELECT id FROM buyers WHERE user_id = ?"
  ).bind(user.id).first();

  const { results } = await env.DB_buyers.prepare(
    `SELECT p.*, s.title
     FROM purchases p
     JOIN tickets t ON p.ticket_id = t.id
     JOIN ${"shows"} s ON t.show_id = s.id
     WHERE p.buyer_id = ?
     ORDER BY p.created_at DESC`
  ).bind(buyer.id).all();

  return json(results);
}

async function createTicket(request, env, user) {
  const { showId } = await request.json();
  if (!showId) return json({ error: "Missing showId" }, 400);

  const buyer = await env.DB_buyers.prepare(
    "SELECT id FROM buyers WHERE user_id = ?"
  ).bind(user.id).first();

  const id = crypto.randomUUID();
  const qr = `ROLLSHOW-${id}`;
  const now = new Date().toISOString();

  await env.DB_buyers.prepare(
    `INSERT INTO tickets (id, show_id, buyer_id, qr_code, stamp, status, created_at)
     VALUES (?, ?, ?, ?, 'unverified', 'pending', ?)`
  ).bind(id, showId, buyer.id, qr, now).run();

  return json({ ticketId: id, status: "pending" });
}

/* ============================================================
   WEBHOOK (PAYMENTS → DB_buyers)
============================================================ */

async function partnerWebhook(request, env) {
  const body = await request.json();
  const { ticketId, amount_cents, partner_transaction_id, status } = body;

  if (status !== "paid") return json({ ok: true });

  const ticket = await env.DB_buyers.prepare(
    "SELECT buyer_id FROM tickets WHERE id = ?"
  ).bind(ticketId).first();

  if (!ticket) return json({ error: "Ticket not found" }, 404);

  await env.DB_buyers.prepare(
    "UPDATE tickets SET status = 'paid', stamp = 'verified' WHERE id = ?"
  ).bind(ticketId).run();

  const purchaseId = crypto.randomUUID();
  const now = new Date().toISOString();

  await env.DB_buyers.prepare(
    `INSERT INTO purchases (id, buyer_id, ticket_id, amount_cents, partner_transaction_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    purchaseId,
    ticket.buyer_id,
    ticketId,
    amount_cents,
    partner_transaction_id,
    now
  ).run();

  return json({ ok: true });
}

/* ============================================================
   HELPERS
============================================================ */

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors() }
  });
}

function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-user-id, x-buyer-id, x-skater-id, x-business-id"
  };
}

async function hash(str) {
  const data = new TextEncoder().encode(str);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("");
}

async function verify(str, hashed) {
  return (await hash(str)) === hashed;
}
